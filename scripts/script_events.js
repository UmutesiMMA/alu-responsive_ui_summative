const STORAGE_KEY = "planner_entries";

function loadEntries() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function deleteEntry(id) {
  const entries = loadEntries().filter((entry) => entry.id !== id);
  saveEntries(entries);
}

function formatDue(dueDate, dueTime) {
  if (!dueDate) return "No due date";
  const date = new Date(`${dueDate}T${dueTime || "00:00"}`);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function displayEvents(entries = loadEntries().filter((e) => e.tag.toLowerCase() === "event")) {
  const overviewList = document.getElementById("overview-list");
  overviewList.innerHTML = "";

  if (entries.length === 0) {
    overviewList.innerHTML = `<li class="empty-state">No items created yet</li>`;
    return;
  }

  entries.forEach((entry) => {
    const li = document.createElement("li");
    li.classList.add("entry-card", `status-${entry.status}`);
    li.dataset.id = entry.id;
    li.dataset.title = entry.title;
    li.dataset.status = entry.status;
    li.innerHTML = `
      <span class="entry-tag">${entry.tag}</span>
      <p class="entry-title">${entry.title}</p>
      <span class="entry-due">${formatDue(entry.dueDate, entry.dueTime)}</span>
      <span class="entry-status status-${entry.status}">${entry.status.replace(/-/g, " ")}</span>
      <div class="card-actions">
        <button class="edit-btn" type="button">Edit</button>
        <button class="delete-btn" type="button">Delete</button>
      </div>
    `;

    li.querySelector(".edit-btn").addEventListener("click", () => openEditDialog(entry));
    li.querySelector(".delete-btn").addEventListener("click", () => {
      deleteEntry(entry.id);
      displayEvents();
    });

    overviewList.appendChild(li);
  });
}

// dialog
const dialog = document.getElementById("add-entry-dialog");
const titleInput = document.getElementById("entryTitle");
const dueDateInput = document.getElementById("due-date");
const dueTimeInput = document.getElementById("due-time");

function openEditDialog(entry) {
  titleInput.value = entry.title;
  document.getElementById("status-dropdown").value = entry.status;
  dueDateInput.value = entry.dueDate;
  dueTimeInput.value = entry.dueTime;
  dialog.dataset.editingId = entry.id;
  dialog.querySelector("h2").textContent = "Edit event";
  dialog.showModal();
}

document.getElementById("openDialog").addEventListener("click", () => dialog.showModal());

function resetDialog() {
  delete dialog.dataset.editingId;
  dialog.querySelector("h2").textContent = "Create event";
  dialog.querySelector("form").reset();
}

document.getElementById("cancel-entry-creation").addEventListener("click", () => {
  resetDialog();
  dialog.close();
});

dialog.addEventListener("cancel", () => {
  resetDialog();
});

titleInput.addEventListener("input", () => {
  titleInput.setCustomValidity(titleInput.value.trim() === "" ? "Title can't be empty" : "");
});

dueDateInput.addEventListener("change", () => {
  const today = new Date().toISOString().split("T")[0];
  dueDateInput.setCustomValidity(
    dueDateInput.value && dueDateInput.value < today ? "Due date can't be in the past" : ""
  );
  dueTimeInput.dispatchEvent(new Event("change"));
});

dueTimeInput.addEventListener("change", () => {
  const today = new Date().toISOString().split("T")[0];
  if (dueDateInput.value && dueTimeInput.value && dueDateInput.value === today) {
    const now = new Date().toTimeString().slice(0, 5);
    dueTimeInput.setCustomValidity(
      dueTimeInput.value < now ? "Due time can't be in the past" : ""
    );
  } else {
    dueTimeInput.setCustomValidity("");
  }
});

document.getElementById("save-entry").addEventListener("click", (e) => {
  e.preventDefault();
  const form = dialog.querySelector("form");
  if (!form.reportValidity()) return;

  const entryData = {
    title: titleInput.value,
    tag: "event",
    status: document.getElementById("status-dropdown").value,
    dueDate: dueDateInput.value,
    dueTime: dueTimeInput.value,
  };

  if (dialog.dataset.editingId) {
    const entries = loadEntries().map((entry) =>
      entry.id === dialog.dataset.editingId ? { ...entry, ...entryData } : entry
    );
    saveEntries(entries);
    delete dialog.dataset.editingId;
    dialog.querySelector("h2").textContent = "Create event";
  } else {
    const entries = loadEntries();
    entries.push({ id: crypto.randomUUID(), createdAt: Date.now(), ...entryData });
    saveEntries(entries);
  }

  dialog.close();
  form.reset();
  displayEvents();
});

// highlight active nav item
const currentPage = window.location.pathname.split("/").pop();
document.querySelectorAll("#nav-items a").forEach((link) => {
  if (link.getAttribute("href") === currentPage) link.classList.add("active");
});

// search
const searchInput = document.getElementById("search-box");
searchInput.addEventListener("input", () => {
  const searchTerm = searchInput.value.trim();
  document.querySelectorAll(".entry-card").forEach((card) => {
    const titleElt = card.querySelector(".entry-title");
    const rawTitle = card.dataset.title;

    if (!searchTerm) {
      titleElt.textContent = rawTitle;
      return;
    }

    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "gi");
    const safeTitle = rawTitle.replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
    titleElt.innerHTML = safeTitle.replace(regex, (match) => `<mark>${match}</mark>`);
  });
});

// sort
const sortDropdown = document.getElementById("sort-dropdown");
sortDropdown.addEventListener("change", () => {
  const sortBy = sortDropdown.value;
  const entries = loadEntries().filter((e) => e.tag.toLowerCase() === "event");

  if (sortBy === "title") {
    entries.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortBy === "status") {
    const order = { "not-started": 0, "in-progress": 1, overdue: 2, done: 3 };
    entries.sort((a, b) => (order[a.status] ?? 4) - (order[b.status] ?? 4));
  } else if (sortBy === "due-date-sort") {
    entries.sort((a, b) => new Date(a.dueDate || "9999") - new Date(b.dueDate || "9999"));
  } else if (sortBy === "due-time-sort") {
    entries.sort((a, b) => (a.dueTime || "99:99").localeCompare(b.dueTime || "99:99"));
  }

  displayEvents(entries);
});

displayEvents();
