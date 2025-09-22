// public/js/attendance.js
document.addEventListener("DOMContentLoaded", async () => {
  // default current datetime-local
  setDefaultDateTime();

  await initInstructors();
  await initCustomers();

  document.getElementById("instructorId").addEventListener("change", onInstructorChange);
  document.getElementById("classId").addEventListener("change", checkSchedule);
  document.getElementById("when").addEventListener("change", checkSchedule);
  document.getElementById("saveBtn").addEventListener("click", () => saveAttendance(false));
});

function setDefaultDateTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); // local tz for input
  document.getElementById("when").value = now.toISOString().slice(0,16);
}

async function initInstructors() {
  const sel = document.getElementById("instructorId");
  sel.innerHTML = `<option value="">-- pick instructor --</option>`;
  const r = await fetch("/api/instructor/getInstructorIds");
  const list = await r.json();
  list.forEach(i => {
    const opt = document.createElement("option");
    opt.value = i.instructorId;
    opt.textContent = `${i.instructorId}: ${i.firstname} ${i.lastname}`;
    sel.appendChild(opt);
  });
}

async function onInstructorChange() {
  const id = document.getElementById("instructorId").value;
  const cls = document.getElementById("classId");
  cls.innerHTML = `<option value="">-- pick class --</option>`;
  if (!id) return;

  const r = await fetch(`/api/attendance/classesByInstructor?instructorId=${encodeURIComponent(id)}`);
  const list = await r.json();
  list.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.classId;
    opt.textContent = `${c.classId} • ${c.day || ""} ${c.time || ""} • ${c.classType || ""}`;
    opt.dataset.day = c.day || "";
    opt.dataset.time = c.time || "";
    cls.appendChild(opt);
  });

  checkSchedule();
}

async function initCustomers() {
  const r = await fetch("/api/customer/getCustomerIds");
  const list = await r.json();
  const box = document.getElementById("customerList");
  box.innerHTML = "";
  list.forEach(c => {
    const id = c.customerId;
    const label = document.createElement("label");
    label.className = "check-row";
    label.innerHTML = `<input type="checkbox" value="${id}"> ${id}: ${c.firstname} ${c.lastname}`;
    box.appendChild(label);
  });
}

function checkSchedule() {
  const warn = document.getElementById("scheduleWarn");
  warn.style.display = "none";

  const sel = document.getElementById("classId");
  const when = document.getElementById("when").value;
  const opt = sel.options[sel.selectedIndex];
  if (!opt || !when) return;

  // Simple check: compare day + HH:MM
  const whenDate = new Date(when);
  const weekdays = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const dow = weekdays[whenDate.getDay()];
  const hhmm = `${String(whenDate.getHours()).padStart(2,"0")}:${String(whenDate.getMinutes()).padStart(2,"0")}`;

  const day = opt.dataset.day || "";
  const timePrefix = (opt.dataset.time || "").slice(0,5);

  if (day && timePrefix && (day !== dow || timePrefix !== hhmm)) {
    warn.style.display = "inline";
  }
}

async function saveAttendance(force) {
  const instructorId = document.getElementById("instructorId").value.trim();
  const classId = document.getElementById("classId").value.trim();
  const when = document.getElementById("when").value;
  const ids = Array.from(document.querySelectorAll("#customerList input[type=checkbox]:checked"))
                   .map(el => el.value);

  if (!instructorId || !classId || !when || ids.length === 0) {
    return alert("Please select instructor, class, date/time, and at least one customer.");
  }

  try {
    const res = await fetch(`/api/attendance/add?force=${force?"true":"false"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instructorId,
        classId,
        when,
        attendees: ids.map(x => ({ customerId: x }))
      })
    });

    const body = await res.json().catch(()=> ({}));

    if (res.status === 409 && body.code === "NEEDS_CONFIRM") {
      const lines = [];
      if (body.warnSchedule) lines.push("Selected time doesn’t match the scheduled class time.");
      if (body.insufficient?.length) {
        lines.push("These customers have insufficient balance:");
        body.insufficient.forEach(s => lines.push(` - ${s.customerId} (bal=${s.balance})`));
      }
      lines.push("\nSave anyway (will allow negative balances)?");
      if (confirm(lines.join("\n"))) {
        return saveAttendance(true);
      }
      return; // cancelled
    }

    if (!res.ok) {
      throw new Error(body.message || body.error || `HTTP ${res.status}`);
    }

    alert("✅ Attendance saved. Confirmations sent.");
    document.getElementById("attForm").reset();
    setDefaultDateTime();
    document.getElementById("classId").innerHTML = `<option value="">-- pick class --</option>`;
  } catch (e) {
    alert("❌ Failed: " + e.message);
  }
}
