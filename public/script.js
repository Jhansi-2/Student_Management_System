
"use strict";

// Connects to your existing Express API.
const API_URL = "/students";

const studentsBody = document.getElementById("students-body");
const searchInput = document.getElementById("search-input");
const dialog = document.getElementById("student-dialog");
const studentForm = document.getElementById("student-form");
const notice = document.getElementById("notice");
const toast = document.getElementById("toast");

let students = [];
let editingStudentId = null;
let toastTimer;

// Display today's date.
document.getElementById("current-date").textContent =
    new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(new Date());

document.getElementById("year").textContent = new Date().getFullYear();

// Escape database values before inserting them into HTML.
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// Format numeric values without unnecessary decimal zeroes.
function formatNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "—";
    }

    return new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 2
    }).format(number);
}

// Read API errors, including errors returned as plain text.
async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        }
    });

    const responseText = await response.text();

    let result = responseText;

    try {
        result = responseText ? JSON.parse(responseText) : null;
    } catch {
        // The existing API returns some responses as plain text.
    }

    if (!response.ok) {
        const message =
            typeof result === "string"
                ? result
                : result?.message || "The request could not be completed.";

        throw new Error(message);
    }

    return result;
}

// Show a temporary notification.
function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3200);
}

// Show a message above the student table.
function showNotice(message, type = "success") {
    notice.textContent = message;
    notice.classList.toggle("error", type === "error");
    notice.hidden = false;
}

function clearNotice() {
    notice.hidden = true;
    notice.textContent = "";
}

// Load all students from MySQL through Express.
async function loadStudents() {
    studentsBody.innerHTML = `
        <tr>
            <td colspan="5" class="loading-cell">
                <span class="spinner"></span> Loading students...
            </td>
        </tr>
    `;

    document.getElementById("refresh-btn").disabled = true;
    clearNotice();

    try {
        const data = await apiRequest(API_URL);

        if (!Array.isArray(data)) {
            throw new Error("The API did not return a student list.");
        }

        students = data;
        renderStudents();
        updateDashboard();
    } catch (error) {
        students = [];
        renderStudents();
        updateDashboard();

        showNotice(
            `Could not load students. ${error.message} Check your server and database.`,
            "error"
        );
    } finally {
        document.getElementById("refresh-btn").disabled = false;
    }
}

// Update the dashboard statistics.
function updateDashboard() {
    const total = students.reduce((sum, student) => {
        const value = Number(student.total);
        return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

    document.getElementById("total-students").textContent =
        formatNumber(students.length);

    document.getElementById("total-points").textContent =
        formatNumber(total);

    document.getElementById("average-total").textContent =
        students.length ? formatNumber(total / students.length) : "0";
}

// Render table rows and apply the search filter.
function renderStudents() {
    const query = searchInput.value.trim().toLowerCase();

    const filteredStudents = students.filter(student => {
        const id = String(student.student_id ?? "").toLowerCase();
        const name = String(student.student_name ?? "").toLowerCase();

        return id.includes(query) || name.includes(query);
    });

    document.getElementById("results-count").textContent =
        `Showing ${filteredStudents.length} of ${students.length} students`;

    if (filteredStudents.length === 0) {
        studentsBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-cell">
                    ${
                        students.length
                            ? "No students match your search."
                            : "No student records found. Add your first student."
                    }
                </td>
            </tr>
        `;
        return;
    }

    studentsBody.innerHTML = filteredStudents.map((student, index) => {
        const id = escapeHTML(student.student_id);
        const name = escapeHTML(student.student_name);
        const total = escapeHTML(formatNumber(student.total));
        const initial = escapeHTML(
            String(student.student_name ?? "?").trim().charAt(0).toUpperCase() || "?"
        );

        const colorClass = `color-${index % 4}`;

        return `
            <tr>
                <td><span class="student-id">#${id}</span></td>

                <td>
                    <div class="student-name-cell">
                        <span class="student-initial ${colorClass}">${initial}</span>
                        <span>${name}</span>
                    </div>
                </td>

                <td><span class="total-pill">${total}</span></td>

                <td><span class="status-pill">Recorded</span></td>

                <td class="action-cell">
                    <div class="action-group">
                        <button
                            type="button"
                            class="action-button"
                            data-action="edit"
                            data-id="${id}"
                            aria-label="Edit ${name}"
                            title="Edit student">✎</button>

                        <button
                            type="button"
                            class="action-button delete"
                            data-action="delete"
                            data-id="${id}"
                            aria-label="Delete ${name}"
                            title="Delete student">⌫</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

// Open a blank form to add a student.
function openAddDialog() {
    editingStudentId = null;
    studentForm.reset();

    document.getElementById("dialog-title").textContent = "Add Student";
    document.getElementById("student-id").disabled = false;
    document.getElementById("id-hint").textContent =
        "Choose a unique student ID.";
    document.getElementById("save-btn").textContent = "Save Student";

    dialog.showModal();
    document.getElementById("student-id").focus();
}

// Open the form with an existing student's data.
function openEditDialog(student) {
    editingStudentId = String(student.student_id);

    document.getElementById("dialog-title").textContent = "Edit Student";
    document.getElementById("student-id").value = student.student_id;
    document.getElementById("student-id").disabled = true;
    document.getElementById("student-name").value = student.student_name ?? "";
    document.getElementById("student-total").value = student.total ?? "";
    document.getElementById("id-hint").textContent =
        "The student ID cannot be changed while editing.";
    document.getElementById("save-btn").textContent = "Update Student";

    dialog.showModal();
    document.getElementById("student-name").focus();
}

// Add or update a student using the API.
studentForm.addEventListener("submit", async event => {
    event.preventDefault();

    const idInput = document.getElementById("student-id");
    const nameInput = document.getElementById("student-name");
    const totalInput = document.getElementById("student-total");

    const id = Number(idInput.value);
    const name = nameInput.value.trim();
    const total = Number(totalInput.value);

    if (!Number.isSafeInteger(id) || id < 1) {
        showToast("Enter a valid positive integer student ID.");
        idInput.focus();
        return;
    }

    if (!name) {
        showToast("Student name cannot be empty.");
        nameInput.focus();
        return;
    }

    if (totalInput.value.trim() === "" ||
        !Number.isFinite(total) || total < 0) {
        showToast("Enter a valid non-negative total.");
        totalInput.focus();
        return;
    }

    const isEditing = editingStudentId !== null;

    if (!isEditing && students.some(student =>
        String(student.student_id) === String(id)
    )) {
        showToast("That student ID already exists.");
        idInput.focus();
        return;
    }

    const saveButton = document.getElementById("save-btn");
    saveButton.disabled = true;
    saveButton.textContent = isEditing ? "Updating..." : "Saving...";

    try {
        const payload = {
            sno: id,
            name,
            total
        };

        if (isEditing) {
            // Existing API: PUT /students/:sno
            await apiRequest(
                `${API_URL}/${encodeURIComponent(editingStudentId)}`,
                {
                    method: "PUT",
                    body: JSON.stringify({ name, total })
                }
            );
        } else {
            // Existing API: POST /students
            await apiRequest(API_URL, {
                method: "POST",
                body: JSON.stringify(payload)
            });
        }

        dialog.close();
        showNotice(
            isEditing
                ? "Student details updated successfully."
                : "Student added successfully."
        );
        showToast(isEditing ? "Student updated." : "Student added.");

        await loadStudents();
    } catch (error) {
        showToast(`Save failed: ${error.message}`);
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = editingStudentId !== null
            ? "Update Student"
            : "Save Student";
    }
});

// Delete a student after confirmation.
async function deleteStudent(student) {
    const confirmed = window.confirm(
        `Delete student "${student.student_name}" (ID: ${student.student_id})?\n\nThis will permanently remove the database record.`
    );

    if (!confirmed) {
        return;
    }

    try {
        await apiRequest(
            `${API_URL}/${encodeURIComponent(student.student_id)}`,
            { method: "DELETE" }
        );

        showNotice("Student deleted successfully.");
        showToast("Student deleted.");
        await loadStudents();
    } catch (error) {
        showNotice(`Could not delete student. ${error.message}`, "error");
        showToast("Delete failed.");
    }
}

// Handle Edit and Delete buttons using event delegation.
studentsBody.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) {
        return;
    }

    const student = students.find(item =>
        String(item.student_id) === button.dataset.id
    );

    if (!student) {
        showToast("Student record not found. Refresh the table.");
        return;
    }

    if (button.dataset.action === "edit") {
        openEditDialog(student);
    } else if (button.dataset.action === "delete") {
        deleteStudent(student);
    }
});

// Search without making another database request.
searchInput.addEventListener("input", renderStudents);

// Buttons and dialog controls.
document.getElementById("add-student-btn")
    .addEventListener("click", openAddDialog);

document.getElementById("refresh-btn")
    .addEventListener("click", loadStudents);

document.getElementById("close-dialog")
    .addEventListener("click", () => dialog.close());

document.getElementById("cancel-btn")
    .addEventListener("click", () => dialog.close());

// Initial page load.
loadStudents();
