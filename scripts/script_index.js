let openDialogBtn = document.getElementById("openDialog");
let dialog = document.getElementById("add-entry-dialog");
let cancelBtn = document.getElementById("cancel-entry-creation");
let saveBtn = document.getElementById("save-entry");
const searchInput = document.getElementById("search-box");

openDialogBtn.addEventListener("click", () => {
  dialog.showModal();
});

// -------- Local storage helpers -------------
const STORAGE_KEY = "planner_entries";

function loadEntries() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

async function seedIfEmpty() {
  let existingEntries = loadEntries();
  if (existingEntries.length === 0) {
    try {
      const res = await fetch("./seed.json");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        saveEntries(data);
      }
    } catch (e) {
      // ToDO: throw proper error?
      console.log("No data in seed.json");
    }
  }
}

function addEntry(entry) {
  const existingEntries = loadEntries();
  existingEntries.push({
    id: crypto.randomUUID(),
    status: "not-started",
    ...entry,
    createdAt: Date.now(),
  });

  console.log(existingEntries);

  saveEntries(existingEntries);
}

function deleteEntry(id) {
  const entries = loadEntries().filter((entry) => entry.id != id);
  saveEntries(entries);
}
function updateEntry(id, changes) {
  const entries = loadEntries().map((entry) =>
    entry.id === id ? { ...entry, ...changes } : entry,
  );
  saveEntries(entries);
}

const titleInput = document.getElementById("entryTitle");
const dueDateInput = document.getElementById("due-date");
const dueTimeInput = document.getElementById("due-time");

titleInput.addEventListener("input", () => {
  titleInput.setCustomValidity(
    titleInput.value.trim() === "" ? "Title can't be empty" : "",
  );
  //TODO-check for potential tags
});

dueDateInput.addEventListener("change", () => {
  const date = dueDateInput.value;
  const today = new Date().toISOString().split("T")[0];
  dueDateInput.setCustomValidity(
    date && date < today ? "Due date can't be in the past" : "",
  );
  // re-check time whenever date changes
  dueTimeInput.dispatchEvent(new Event("change"));
});

dueTimeInput.addEventListener("change", () => {
  const date = dueDateInput.value;
  const time = dueTimeInput.value;
  const today = new Date().toISOString().split("T")[0];

  if (date && time && date === today) {
    const now = new Date().toTimeString().slice(0, 5); // "HH:MM"
    dueTimeInput.setCustomValidity(
      time < now ? "Due time can't be in the past" : "",
    );
  } else {
    dueTimeInput.setCustomValidity("");
  }
});

cancelBtn.addEventListener("click", () => {
  delete dialog.dataset.editingId;
  dialog.querySelector("h2").textContent = "Create task/event";
  dialog.querySelector("form").reset();
  dialog.close();
});

saveBtn.addEventListener("click", (e) => {
  e.preventDefault();
  const form = dialog.querySelector("form");
  if (!form.reportValidity()) return;

  const entryData = {
    title: titleInput.value,
    tag: document.getElementById("tags-dropdown").value,
    status: document.getElementById("status-dropdown").value,
    dueDate: dueDateInput.value,
    dueTime: dueTimeInput.value,
  };

  if (dialog.dataset.editingId) {
    updateEntry(dialog.dataset.editingId, entryData);
    delete dialog.dataset.editingId;
    dialog.querySelector("h2").textContent = "Create task/event";
  } else {
    addEntry(entryData);
  }

  dialog.close();
  form.reset();
  displayEntries();
});

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

function updateCounts() {
  const all = loadEntries();
  document.getElementById("count-all").textContent = `All: ${all.length}`;
  document.getElementById("count-tasks").textContent = `Tasks: ${all.filter((e) => e.tag.toLowerCase() === "task").length}`;
  document.getElementById("count-events").textContent = `Events: ${all.filter((e) => e.tag.toLowerCase() === "event").length}`;
}

function displayEntries(entries = loadEntries()) {
  const overviewList = document.getElementById("overview-list");

  overviewList.innerHTML = "";
  updateCounts();

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

    li.querySelector(".edit-btn").addEventListener("click", () =>
      openEditDialog(entry),
    );
    li.querySelector(".delete-btn").addEventListener("click", () => {
      deleteEntry(entry.id);
      displayEntries();
    });

    overviewList.appendChild(li);
  });
}

function openEditDialog(entry) {
  titleInput.value = entry.title;
  document.getElementById("tags-dropdown").value = entry.tag;
  document.getElementById("status-dropdown").value = entry.status;
  dueDateInput.value = entry.dueDate;
  dueTimeInput.value = entry.dueTime;
  dialog.dataset.editingId = entry.id;
  dialog.querySelector("h2").textContent = "Edit task/event";
  dialog.showModal();
}

// highlight active nav item
const currentPage = window.location.pathname.split("/").pop() || "index.html";
document.querySelectorAll("#nav-items a").forEach((link) => {
  if (link.getAttribute("href") === currentPage) link.classList.add("active");
});

seedIfEmpty().then(displayEntries);

//search logic

searchInput.addEventListener("input", () => {
  const searchTerm = searchInput.value.trim();
  document.querySelectorAll(".entry-card").forEach((card) => {
    const titleElt = card.querySelector(".entry-title");
    const statusElt = card.querySelector(".entry-status");
    const rawTitle = card.dataset.title;

    if (!searchTerm) {
      titleElt.textContent = rawTitle;
      return;
    }
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "gi"); // g = all matches, i = case-insensitive

    const safeTitle = rawTitle.replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
    titleElt.innerHTML = safeTitle.replace(
      regex,
      (match) => `<mark>${match}</mark>`,
    );
  });
});

// sort logic
const sortDropdown = document.getElementById("sort-dropdown");

sortDropdown.addEventListener("change", () => {
  const sortBy = sortDropdown.value;
  const entries = loadEntries();

  if (sortBy === "title") {
    entries.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortBy === "status") {
    const order = { "not-started": 0, "in-progress": 1, overdue: 2, done: 3 };
    entries.sort((a, b) => (order[a.status] ?? 4) - (order[b.status] ?? 4));
  } else if (sortBy === "due-date-sort") {
    entries.sort(
      (a, b) => new Date(a.dueDate || "9999") - new Date(b.dueDate || "9999"),
    );
  } else if (sortBy === "due-time-sort") {
    entries.sort((a, b) =>
      (a.dueTime || "99:99").localeCompare(b.dueTime || "99:99"),
    );
  }

  displayEntries(entries);
});
