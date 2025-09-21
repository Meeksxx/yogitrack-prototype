// public/js/instructor.js
let formMode = "search";

document.addEventListener("DOMContentLoaded", () => {
  setFormForSearch();
  initInstructorDropdown();
  addInstructorDropdownListener();
});

/* -------------------- Buttons -------------------- */
document.getElementById("searchBtn").addEventListener("click", () => {
  clearInstructorForm();
  setFormForSearch();
  initInstructorDropdown();
});

document.getElementById("addBtn").addEventListener("click", () => {
  setFormForAdd();
});

document.getElementById("saveBtn").addEventListener("click", onSaveInstructor);

document.getElementById("deleteBtn").addEventListener("click", onDeleteInstructor);

/* -------------------- Handlers -------------------- */
async function onSaveInstructor() {
  if (formMode !== "add") return;

  const form = document.getElementById("instructorForm");

  // simple client validation
  const errs = [];
  if (!form.firstname.value.trim()) errs.push("First name is required");
  if (!form.lastname.value.trim())  errs.push("Last name is required");
  if (errs.length) { alert("Please fix:\n• " + errs.join("\n• ")); return; }

  // get next ID & show it
  const idRes = await fetch("/api/instructor/getNextId");
  if (!idRes.ok) return alert("Could not get next instructor id");
  const { nextId } = await idRes.json();
  document.getElementById("instructorIdText").value = nextId;

  const pref = form.querySelector('input[name="pref"]:checked');
  const payload = {
    instructorId: nextId,
    firstname: form.firstname.value.trim(),
    lastname:  form.lastname.value.trim(),
    address:   form.address.value.trim(),
    phone:     form.phone.value.trim(),
    email:     form.email.value.trim(),
    preferredContact: pref ? pref.value : "email",
  };

  try {
    // first attempt
    let resp = await fetch("/api/instructor/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let body = await resp.json().catch(() => ({}));

    // duplicate name? ask to force
    if (resp.status === 409 && body.code === "DUPLICATE_NAME") {
      const ok = confirm("An instructor with this name already exists. Save anyway?");
      if (!ok) { alert("Save cancelled."); return; }
      resp = await fetch("/api/instructor/add?force=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      body = await resp.json().catch(() => ({}));
    }

    if (!resp.ok) throw new Error(body.message || body.error || `HTTP ${resp.status}`);

    alert(`✅ Instructor ${payload.instructorId} added successfully!`);
    form.reset();
    setFormForSearch();
    initInstructorDropdown();
  } catch (e) {
    alert(`❌ Error: ${e.message}`);
  }
}

async function onDeleteInstructor() {
  const select = document.getElementById("instructorIdSelect");
  const val = select.value;
  if (!val) return alert("Pick an instructor to delete.");
  const instructorId = val.split(":")[0];

  if (!confirm(`Delete ${instructorId}?`)) return;

  const resp = await fetch(`/api/instructor/deleteInstructor?instructorId=${encodeURIComponent(instructorId)}`, {
    method: "DELETE",
  });

  const result = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    alert(`Delete failed: ${result.message || result.error || resp.status}`);
    return;
  }
  alert(`Instructor ${instructorId} deleted`);
  clearInstructorForm();
  initInstructorDropdown();
}

/* -------------------- Helpers -------------------- */
async function initInstructorDropdown() {
  const select = document.getElementById("instructorIdSelect");
  try {
    const res = await fetch("/api/instructor/getInstructorIds");
    const ids = await res.json();

    select.innerHTML = `<option value="">-- Select Instructor Id --</option>`;
    ids.forEach((instr) => {
      const option = document.createElement("option");
      option.value = `${instr.instructorId}:${instr.firstname}`;
      option.textContent = `${instr.instructorId}:${instr.firstname} ${instr.lastname}`;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Failed to load instructor IDs:", err);
  }
}

function addInstructorDropdownListener() {
  const form = document.getElementById("instructorForm");
  const select = document.getElementById("instructorIdSelect");
  select.addEventListener("change", async () => {
    const instructorId = (select.value || "").split(":")[0];
    if (!instructorId) return;

    try {
      const res = await fetch(`/api/instructor/getInstructor?instructorId=${encodeURIComponent(instructorId)}`);
      if (!res.ok) throw new Error("Instructor search failed");
      const data = await res.json();

      form.firstname.value = data.firstname || "";
      form.lastname.value  = data.lastname  || "";
      form.address.value   = data.address   || "";
      form.phone.value     = data.phone     || "";
      form.email.value     = data.email     || "";

      const mode = (data.preferredContact || "email").toLowerCase();
      const phoneRadio = form.querySelector('input[name="pref"][value="phone"]');
      const emailRadio = form.querySelector('input[name="pref"][value="email"]');
      if (mode === "phone" && phoneRadio) phoneRadio.checked = true;
      else if (emailRadio) emailRadio.checked = true;
    } catch (err) {
      alert(`Error searching instructor: ${err.message}`);
    }
  });
}

function clearInstructorForm() {
  document.getElementById("instructorForm").reset();
  document.getElementById("instructorIdSelect").innerHTML = "";
}

function setFormForSearch() {
  formMode = "search";
  document.getElementById("instructorIdLabel").style.display = "block";
  document.getElementById("instructorIdTextLabel").style.display = "none";
  document.getElementById("instructorIdText").style.display = "none";
  document.getElementById("instructorIdText").value = "";
  const emailRadio = document.querySelector('input[name="pref"][value="email"]');
  if (emailRadio) emailRadio.checked = true;
}

function setFormForAdd() {
  formMode = "add";
  document.getElementById("instructorIdLabel").style.display = "none";
  document.getElementById("instructorIdTextLabel").style.display = "block";
  document.getElementById("instructorIdText").style.display = "block";
  document.getElementById("instructorForm").reset();
  const emailRadio = document.querySelector('input[name="pref"][value="email"]');
  if (emailRadio) emailRadio.checked = true;
}
