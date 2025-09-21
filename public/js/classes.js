let formMode = "search";

document.addEventListener("DOMContentLoaded", () => {
  setFormForSearch();
  initClassDropdown();
  initInstructorDropdown();
  addClassDropdownListener();

  document.getElementById("searchBtn").addEventListener("click", onSearchClick);
  document.getElementById("addBtn").addEventListener("click", onAddClick);
  document.getElementById("saveBtn").addEventListener("click", onSaveClick);
  document.getElementById("deleteBtn").addEventListener("click", onDeleteClick);
  document.getElementById("addSlotBtn").addEventListener("click", addSlotRow);

  // start with one empty slot in either mode
  clearSlots();
  addSlotRow();
});

function onSearchClick() {
  clearClassForm();
  setFormForSearch();
  initClassDropdown();
}

function onAddClick() {
  setFormForAdd();
  setNextClassId();
}

async function onSaveClick() {
  if (formMode !== "add") return;

  const form = document.getElementById("classForm");
  const errors = validateClassForm(form);
  if (errors.length) {
    alert("Please fix:\n• " + errors.join("\n• "));
    return;
  }

  const payload = buildPayload(form);

  try {
    let resp = await fetch("/api/class/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let result = await resp.json().catch(() => ({}));

    if (resp.status === 409 && result.code === "SCHEDULE_CONFLICT") {
      const s = result.suggestions?.[0];
      if (s) {
        const ok = confirm(
          `Schedule conflict detected.\nTry suggestion: ${s.day} ${s.time} (${s.duration} min)?`
        );
        if (!ok) return alert("Save cancelled.");
        // apply suggestion to first slot and retry
        const rows = [...document.querySelectorAll(".slot-row")];
        rows[0].querySelector('select[name="day"]').value = s.day;
        rows[0].querySelector('input[name="time"]').value = s.time;
        rows[0].querySelector('input[name="duration"]').value = s.duration;

        const retryPayload = buildPayload(form);
        resp = await fetch("/api/class/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(retryPayload),
        });
        result = await resp.json().catch(() => ({}));
      }
    }

    if (!resp.ok) throw new Error(result.message || result.error || `HTTP ${resp.status}`);

    alert(`✅ Class ${result.class.classId} added!`);
    form.reset();
    clearSlots(); addSlotRow();
    setFormForSearch();
    initClassDropdown();
  } catch (err) {
    alert(`❌ Error: ${err.message}`);
  }
}

async function onDeleteClick() {
  const select = document.getElementById("classIdSelect");
  const val = select.value;
  if (!val) return alert("Pick a class to delete.");
  const classId = val.split(":")[0];
  if (!confirm(`Delete ${classId}?`)) return;

  const resp = await fetch(`/api/class/delete?classId=${encodeURIComponent(classId)}`, {
    method: "DELETE",
  });
  const result = await resp.json().catch(() => ({}));
  if (!resp.ok) return alert(result.message || result.error || resp.status);
  alert(`Class ${classId} deleted`);
  clearClassForm();
  initClassDropdown();
}

/* ------------ helpers ------------- */

function validateClassForm(form) {
  const errors = [];
  if (!form.className.value.trim()) errors.push("Class name is required");
  if (!form.instructorId.value.trim()) errors.push("Instructor is required");
  const rows = [...document.querySelectorAll(".slot-row")];
  if (!rows.length) errors.push("At least one schedule slot is required");
  rows.forEach((r, idx) => {
    const day = r.querySelector('select[name="day"]').value;
    const time = r.querySelector('input[name="time"]').value;
    const dur = Number(r.querySelector('input[name="duration"]').value);
    if (!day) errors.push(`Slot ${idx + 1}: day is required`);
    if (!/^\d{2}:\d{2}$/.test(time)) errors.push(`Slot ${idx + 1}: time is required`);
    if (!dur || dur <= 0) errors.push(`Slot ${idx + 1}: duration must be positive`);
  });
  return errors;
}

function buildPayload(form) {
  const slots = [...document.querySelectorAll(".slot-row")].map((r) => ({
    day: r.querySelector('select[name="day"]').value,
    time: r.querySelector('input[name="time"]').value,
    duration: Number(r.querySelector('input[name="duration"]').value),
  }));
  return {
    classId: document.getElementById("classIdText").value.trim(),
    className: form.className.value.trim(),
    instructorId: form.instructorId.value,
    classType: form.classType.value,
    payRate: Number(form.payRate.value || 0),
    description: form.description.value.trim(),
    slots,
  };
}

async function setNextClassId() {
  try {
    const r = await fetch("/api/class/getNextId");
    const { nextId } = await r.json();
    document.getElementById("classIdText").value = nextId;
  } catch { /* ignore */ }
}

async function initClassDropdown() {
  const select = document.getElementById("classIdSelect");
  try {
    const r = await fetch("/api/class/getClassIds");
    const list = await r.json();
    select.innerHTML = `<option value="">-- Select Class Id --</option>`;
    list.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = `${c.classId}:${c.className}`;
      opt.textContent = `${c.classId}: ${c.className}`;
      select.appendChild(opt);
    });
  } catch (e) {
    console.error("getClassIds failed", e);
  }
}

function addClassDropdownListener() {
  const select = document.getElementById("classIdSelect");
  select.addEventListener("change", async () => {
    const classId = (select.value || "").split(":")[0];
    if (!classId) return;

    try {
      const r = await fetch(`/api/class/getClass?classId=${encodeURIComponent(classId)}`);
      if (!r.ok) throw new Error("Class fetch failed");
      const d = await r.json();

      const form = document.getElementById("classForm");
      document.getElementById("classIdText").value = d.classId || "";
      form.className.value = d.className || "";
      form.instructorId.value = d.instructorId || "";
      form.classType.value = d.classType || "General";
      form.payRate.value = d.payRate ?? 0;
      form.description.value = d.description || "";

      clearSlots();
      (d.slots || []).forEach((s) => addSlotRow(s.day, s.time, s.duration));
      if (!(d.slots || []).length) addSlotRow();
    } catch (e) {
      alert(`Error loading ${classId}: ${e.message}`);
    }
  });
}

async function initInstructorDropdown() {
  const select = document.getElementById("instructorSelect");
  try {
    const r = await fetch("/api/instructor/getInstructorIds");
    const list = await r.json();
    list.forEach((i) => {
      const opt = document.createElement("option");
      opt.value = i.instructorId;
      opt.textContent = `${i.instructorId}: ${i.firstname} ${i.lastname}`;
      select.appendChild(opt);
    });
  } catch (e) {
    console.error("getInstructorIds failed", e);
  }
}

/* slots UI */
function clearSlots() {
  document.getElementById("slots").innerHTML = "";
}
function addSlotRow(day = "Mon", time = "", duration = 45) {
  const wrap = document.getElementById("slots");
  const row = document.createElement("div");
  row.className = "slot-row grid-2";
  row.style.marginBottom = "8px";
  row.innerHTML = `
    <label>Day
      <select name="day" class="styled-select">
        <option ${day==="Mon"?"selected":""}>Mon</option>
        <option ${day==="Tue"?"selected":""}>Tue</option>
        <option ${day==="Wed"?"selected":""}>Wed</option>
        <option ${day==="Thu"?"selected":""}>Thu</option>
        <option ${day==="Fri"?"selected":""}>Fri</option>
        <option ${day==="Sat"?"selected":""}>Sat</option>
        <option ${day==="Sun"?"selected":""}>Sun</option>
      </select>
    </label>
    <label>Time / Duration
      <input name="time" type="time" value="${time}" style="width: 140px" />
      <input name="duration" type="number" min="15" step="5" value="${duration}" style="width: 90px" /> min
      <button type="button" class="btn btn-danger" style="margin-left:.5rem" onclick="this.closest('.slot-row').remove()">Remove</button>
    </label>
  `;
  wrap.appendChild(row);
}

/* form mode & resets */
function clearClassForm() {
  document.getElementById("classForm").reset();
  document.getElementById("classIdSelect").innerHTML = "";
  document.getElementById("classIdText").value = "";
  clearSlots(); addSlotRow();
}
function setFormForSearch() {
  formMode = "search";
  document.getElementById("classIdLabel").style.display = "block";
  document.getElementById("classIdTextLabel").style.display = "none";
  document.getElementById("classIdText").style.display = "none";
}
function setFormForAdd() {
  formMode = "add";
  document.getElementById("classIdLabel").style.display = "none";
  document.getElementById("classIdTextLabel").style.display = "block";
  document.getElementById("classIdText").style.display = "block";
  document.getElementById("classForm").reset();
  clearSlots(); addSlotRow();
}
