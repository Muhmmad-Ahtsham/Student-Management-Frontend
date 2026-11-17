"use strict";

/* ============================================================
   Lab 6: Student Management Frontend
   DOM + Events + Validation + localStorage (JSON)
   ============================================================ */

const STORAGE_KEY = "students";
const DEPARTMENTS = ["Software Engineering", "Information Technology", "Data Science", "Computer Science"];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ---------- Data layer (localStorage) ---------- */

function loadStudents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return seedData();          // first run only
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Could not read localStorage:", err);
    return [];
  }
}

function saveStudents() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  } catch (err) {
    console.error("Could not save to localStorage:", err);
    showMessage("Storage error: could not save data.", false);
  }
}

function seedData() {
  const sample = [
    { name: "Ali Ahmed", rollNo: "2k24-SE-01", email: "ali@example.com", department: "Software Engineering", semester: 3 },
    { name: "Sara Khan", rollNo: "2k24-IT-07", email: "sara@example.com", department: "Information Technology", semester: 5 },
    { name: "Hamza Ali", rollNo: "2k24-DS-12", email: "hamza@example.com", department: "Data Science", semester: 2 }
  ].map(s => ({ id: generateId(), ...s }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sample));
  return sample;
}

function generateId() {
  return "S" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ---------- State & DOM references ---------- */

let students = loadStudents();
let editingId = null;

const $ = id => document.getElementById(id);
const form = $("studentForm");
const tbody = $("studentTableBody");
const fields = ["name", "rollNo", "email", "department", "semester"];

/* ---------- Helpers ---------- */

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = String(value);
  return div.innerHTML;                           // prevents XSS in innerHTML
}

function fillSelect(select, items, placeholder) {
  select.innerHTML = `<option value="">${placeholder}</option>` +
    items.map(i => `<option value="${escapeHTML(i)}">${escapeHTML(i)}</option>`).join("");
}

function showMessage(text, ok = true) {
  const msg = $("formMessage");
  msg.textContent = text;
  msg.className = "message " + (ok ? "success" : "fail");
}

/* ---------- Validation ---------- */

function validate(data) {
  const errors = {};
  if (!data.name.trim()) errors.name = "Name is required.";
  else if (data.name.trim().length < 3) errors.name = "Name must be at least 3 characters.";

  if (!data.rollNo.trim()) errors.rollNo = "Roll number is required.";
  else if (students.some(s => s.rollNo.toLowerCase() === data.rollNo.trim().toLowerCase() && s.id !== editingId))
    errors.rollNo = "This roll number already exists.";

  if (!data.email.trim()) errors.email = "Email is required.";
  else if (!EMAIL_PATTERN.test(data.email.trim())) errors.email = "Enter a valid email address.";
  else if (students.some(s => s.email.toLowerCase() === data.email.trim().toLowerCase() && s.id !== editingId))
    errors.email = "This email is already registered.";

  if (!data.department) errors.department = "Select a department.";
  if (!data.semester) errors.semester = "Select a semester.";
  return errors;
}

function showErrors(errors) {
  fields.forEach(f => {
    $(f + "Error").textContent = errors[f] || "";
    $(f).closest(".field").classList.toggle("invalid", Boolean(errors[f]));
  });
}

/* ---------- Create / Update ---------- */

function readForm() {
  return {
    name: $("name").value,
    rollNo: $("rollNo").value,
    email: $("email").value,
    department: $("department").value,
    semester: $("semester").value
  };
}

function handleSubmit(event) {
  event.preventDefault();
  const data = readForm();
  const errors = validate(data);
  showErrors(errors);
  if (Object.keys(errors).length) {
    showMessage("Please fix the errors above.", false);
    return;
  }

  const record = {
    name: data.name.trim(),
    rollNo: data.rollNo.trim(),
    email: data.email.trim().toLowerCase(),
    department: data.department,
    semester: Number(data.semester)               // string -> number
  };

  if (editingId) {
    const index = students.findIndex(s => s.id === editingId);
    students[index] = { id: editingId, ...record };
    showMessage("Student updated successfully.");
  } else {
    students.push({ id: generateId(), ...record });
    showMessage("Student added successfully.");
  }
  saveStudents();
  resetForm(true);
  render();
}

function startEdit(id) {
  const s = students.find(x => x.id === id);
  if (!s) return;
  editingId = id;
  fields.forEach(f => { $(f).value = s[f]; });
  showErrors({});
  $("formTitle").textContent = "Edit Student";
  $("submitBtn").textContent = "Update Student";
  $("cancelBtn").hidden = false;
  form.scrollIntoView({ behavior: "smooth" });
  $("name").focus();
}

function resetForm(keepMessage = false) {
  form.reset();
  editingId = null;
  showErrors({});
  $("formTitle").textContent = "Add Student";
  $("submitBtn").textContent = "Add Student";
  $("cancelBtn").hidden = true;
  if (!keepMessage) showMessage("");
}

/* ---------- Delete / View ---------- */

function deleteStudent(id) {
  const s = students.find(x => x.id === id);
  if (!s || !confirm(`Delete ${s.name}? This cannot be undone.`)) return;
  students = students.filter(x => x.id !== id);
  if (editingId === id) resetForm();
  saveStudents();
  render();
  showMessage("Student deleted.");
}

function viewStudent(id) {
  const s = students.find(x => x.id === id);
  if (!s) return;
  const rows = [["Name", s.name], ["Roll No", s.rollNo], ["Email", s.email],
                ["Department", s.department], ["Semester", s.semester], ["Record ID", s.id]];
  $("viewBody").innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${escapeHTML(v)}</dd>`).join("");
  $("viewDialog").showModal();
}

/* ---------- Search, Filter, Sort ---------- */

function getVisibleStudents() {
  const term = $("searchInput").value.trim().toLowerCase();
  const dept = $("deptFilter").value;
  const sem = $("semFilter").value;
  const [key, dir] = $("sortSelect").value.split("-");

  const list = students.filter(s =>
    (!term || [s.name, s.rollNo, s.email].some(v => v.toLowerCase().includes(term))) &&
    (!dept || s.department === dept) &&
    (!sem || String(s.semester) === sem)
  );

  list.sort((a, b) => {
    const result = typeof a[key] === "number"
      ? a[key] - b[key]
      : String(a[key]).localeCompare(String(b[key]));
    return dir === "desc" ? -result : result;
  });
  return list;
}

/* ---------- Render (no page reload) ---------- */

function render() {
  const visible = getVisibleStudents();

  tbody.innerHTML = visible.length
    ? visible.map((s, i) => `
      <tr data-id="${escapeHTML(s.id)}">
        <td>${i + 1}</td>
        <td>${escapeHTML(s.rollNo)}</td>
        <td>${escapeHTML(s.name)}</td>
        <td>${escapeHTML(s.email)}</td>
        <td>${escapeHTML(s.department)}</td>
        <td>${escapeHTML(s.semester)}</td>
        <td class="row-actions">
          <button class="btn small" data-action="view">View</button>
          <button class="btn small" data-action="edit">Edit</button>
          <button class="btn small danger" data-action="delete">Delete</button>
        </td>
      </tr>`).join("")
    : `<tr><td colspan="7" class="empty">No students found.</td></tr>`;

  // Record count cards
  $("countTotal").textContent = students.length;
  $("countShown").textContent = visible.length;
  $("countDepts").textContent = new Set(students.map(s => s.department)).size;
  $("countSems").textContent = new Set(students.map(s => s.semester)).size;
}

/* ---------- Import / Export JSON ---------- */

function exportJSON() {
  const blob = new Blob([JSON.stringify(students, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "students.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error("File must contain an array.");
      let added = 0, skipped = 0;
      data.forEach(item => {
        const rec = {
          name: String(item.name ?? ""), rollNo: String(item.rollNo ?? ""),
          email: String(item.email ?? ""), department: item.department ?? "",
          semester: item.semester ?? ""
        };
        editingId = null;
        if (Object.keys(validate(rec)).length || !DEPARTMENTS.includes(rec.department)) { skipped++; return; }
        students.push({ id: generateId(), ...rec, name: rec.name.trim(), rollNo: rec.rollNo.trim(),
                        email: rec.email.trim().toLowerCase(), semester: Number(rec.semester) });
        added++;
      });
      saveStudents();
      render();
      showMessage(`Import finished: ${added} added, ${skipped} skipped.`, added > 0);
    } catch (err) {
      showMessage("Import failed: " + err.message, false);
    }
  };
  reader.readAsText(file);
}

/* ---------- Events ---------- */

form.addEventListener("submit", handleSubmit);
$("cancelBtn").addEventListener("click", () => resetForm());

// Event delegation: one listener handles every row's buttons
tbody.addEventListener("click", e => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.closest("tr").dataset.id;
  const actions = { view: viewStudent, edit: startEdit, delete: deleteStudent };
  actions[btn.dataset.action](id);
});

["searchInput", "deptFilter", "semFilter", "sortSelect"].forEach(id =>
  $(id).addEventListener(id === "searchInput" ? "input" : "change", render));

$("clearFilters").addEventListener("click", () => {
  $("searchInput").value = "";
  $("deptFilter").value = "";
  $("semFilter").value = "";
  $("sortSelect").value = "name-asc";
  render();
});

$("exportBtn").addEventListener("click", exportJSON);
$("importFile").addEventListener("change", e => {
  if (e.target.files[0]) importJSON(e.target.files[0]);
  e.target.value = "";
});
$("closeView").addEventListener("click", () => $("viewDialog").close());

/* ---------- Init ---------- */

fillSelect($("department"), DEPARTMENTS, "Select department");
fillSelect($("semester"), SEMESTERS, "Select semester");
fillSelect($("deptFilter"), DEPARTMENTS, "All departments");
fillSelect($("semFilter"), SEMESTERS, "All semesters");
render();
