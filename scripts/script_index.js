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
  const entries = loadEntries().sort((entry) => entry.id != id);
  saveEntries(entries);
}
function updateEntry(id, changes) {
  const entries = loadEntries().map((entry) =>
    entry.id === id ? { ...entry, ...changes } : entry,
  );
  saveEntries(entries);
}

cancelBtn.addEventListener("click", () => {
  dialog.closest();
});
saveBtn.addEventListener("click", (e) => {
  let entryTitle = document.getElementById("entryTitle").value;
  let entryTag = document.getElementById("tags-dropdown").value;
  let dueDate = document.getElementById("due-date").value;
  let dueTime = document.getElementById("due-time").value;

  e.preventDefault();

  let entry = {
    title: entryTitle,
    tag: entryTag,
    dueDate: dueDate,
    dueTime: dueTime,
  };
  console.log(entry);
  addEntry(entry);

  dialog.close();
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

function displayEntries(entries = loadEntries()) {
  const overviewList = document.getElementById("overview-list");

  overviewList.innerHTML = "";

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
    `;
    overviewList.appendChild(li);
  });
}

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
