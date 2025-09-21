console.log("packages.js loaded");

let pkgMode = "search"; // "search" or "add"

document.addEventListener("DOMContentLoaded", () => {
  wireEvents();
  setFormForSearch();
  initDropdown();
});

function wireEvents() {
  document.getElementById("searchBtn").addEventListener("click", () => {
    clearForm();
    setFormForSearch();
    initDropdown();
  });

  document.getElementById("addBtn").addEventListener("click", async () => {
    setFormForAdd();
    await refreshNextId(); // show next id immediately
  });

  document.getElementById("saveBtn").addEventListener("click", onSave);

  // Not implemented in API; keep UX consistent
  document.getElementById("deleteBtn").addEventListener("click", () => {
    alert("Delete not implemented in this increment.");
  });

  document.getElementById("packageIdSelect").addEventListener("change", onPickExisting);

  document.getElementById("category").addEventListener("change", () => {
    if (pkgMode === "add") refreshNextId();
  });

  document.getElementById("isUnlimited").addEventListener("change", (e) => {
    const n = document.getElementById("numClasses");
    if (e.target.checked) {
      n.value = 0;
      n.setAttribute("disabled", "disabled");
    } else {
      n.removeAttribute("disabled");
      if (Number(n.value) === 0) n.value = 4;
    }
  });
}

/* ---------- Modes ---------- */
function setFormForSearch() {
  pkgMode = "search";
  document.getElementById("pkgIdSelectLabel").style.display = "block";
  document.getElementById("pkgIdTextLabel").style.display   = "none";
  document.getElementById("packageId").style.display         = "none";
  document.getElementById("packageId").value = "";
}

function setFormForAdd() {
  pkgMode = "add";
  document.getElementById("pkgIdSelectLabel").style.display = "none";
  document.getElementById("pkgIdTextLabel").style.display   = "block";
  document.getElementById("packageId").style.display         = "block";
  document.getElementById("packageId").readOnly              = true;

  clearForm();
  // sensible defaults
  document.getElementById("category").value  = "General";
  document.getElementById("classType").value = "General";
  document.getElementById("isUnlimited").checked = false;
  document.getElementById("numClasses").removeAttribute("disabled");
}

function clearForm() {
  document.getElementById("packageForm").reset();
  document.getElementById("packageIdSelect").innerHTML =
    `<option value="">-- Select Package --</option>`;
}

/* ---------- Data helpers ---------- */
async function initDropdown() {
  try {
    const res = await fetch("/api/package/getPackageIds");
    const list = await res.json();
    const sel = document.getElementById("packageIdSelect");
    sel.innerHTML = `<option value="">-- Select Package --</option>`;
    list.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.packageId;
      opt.textContent = `${p.packageId}: ${p.name} (${p.category})`;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.error("Failed to load package list:", e);
  }
}

async function refreshNextId() {
  const cat = document.getElementById("category").value || "General";
  const res = await fetch(`/api/package/getNextId?category=${encodeURIComponent(cat)}`);
  const body = await res.json();
  document.getElementById("packageId").value = body.nextId || "";
}

async function onPickExisting() {
  const id = document.getElementById("packageIdSelect").value;
  if (!id) return;
  try {
    const r = await fetch(`/api/package/getPackage?packageId=${encodeURIComponent(id)}`);
    const p = await r.json();

    // Fill form (stays in search mode)
    document.getElementById("category").value   = p.category || "General";
    document.getElementById("classType").value  = p.classType || "General";
    document.getElementById("name").value       = p.name || "";
    document.getElementById("numClasses").value = Number(p.numClasses || 0);
    document.getElementById("isUnlimited").checked = !!p.isUnlimited;

    const n = document.getElementById("numClasses");
    if (p.isUnlimited) { n.setAttribute("disabled","disabled"); } else { n.removeAttribute("disabled"); }

    document.getElementById("startDate").value = p.startDate ? p.startDate.slice(0,10) : "";
    document.getElementById("endDate").value   = p.endDate   ? p.endDate.slice(0,10)   : "";
    document.getElementById("price").value     = (p.price ?? "");
  } catch (e) {
    alert("Failed to load package: " + e.message);
  }
}

/* ---------- Save ---------- */
function validateForm() {
  const errs = [];
  const name = document.getElementById("name").value.trim();
  const price = Number(document.getElementById("price").value);
  const start = document.getElementById("startDate").value;
  const end   = document.getElementById("endDate").value;
  const unlimited = document.getElementById("isUnlimited").checked;
  const num = Number(document.getElementById("numClasses").value);

  if (!name) errs.push("Name is required");
  if (!Number.isFinite(price) || price < 0) errs.push("Price must be 0 or more");
  if (!start) errs.push("Start date is required");
  if (!end)   errs.push("End date is required");
  if (start && end && new Date(start) > new Date(end)) errs.push("Start date cannot be after end date");
  if (!unlimited && (!Number.isInteger(num) || num < 1)) errs.push("# Classes must be at least 1 (or mark Unlimited)");

  return errs;
}

async function onSave() {
  if (pkgMode !== "add") {
    alert("Click 'Add New' first to create a package.");
    return;
  }

  const errs = validateForm();
  if (errs.length) {
    alert("Please fix:\n• " + errs.join("\n• "));
    return;
  }

  const payload = {
    packageId: document.getElementById("packageId").value,
    name:      document.getElementById("name").value.trim(),
    category:  document.getElementById("category").value,
    classType: document.getElementById("classType").value,
    numClasses: Number(document.getElementById("numClasses").value || 0),
    isUnlimited: document.getElementById("isUnlimited").checked,
    startDate: document.getElementById("startDate").value,
    endDate:   document.getElementById("endDate").value,
    price:     Number(document.getElementById("price").value)
  };

  try {
    let resp = await fetch("/api/package/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    let body = await resp.json().catch(() => ({}));

    if (resp.status === 409 && body.code === "DUPLICATE_NAME") {
      const ok = confirm("A package with the same name & category exists. Save anyway?");
      if (!ok) return;
      resp = await fetch("/api/package/add?force=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      body = await resp.json().catch(() => ({}));
    }

    if (!resp.ok) throw new Error(body.message || body.error || `HTTP ${resp.status}`);

    alert(`✅ Package ${payload.packageId} added!`);
    // Reset to search mode and refresh list
    setFormForSearch();
    clearForm();
    initDropdown();
  } catch (e) {
    alert("❌ Save failed: " + e.message);
  }
}
