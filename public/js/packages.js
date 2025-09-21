let formMode = "search"; // "search" or "add"

document.addEventListener("DOMContentLoaded", () => {
  setFormForSearch();
  initPackageDropdown();
  addPackageDropdownListener();

  document.getElementById("searchBtn").addEventListener("click", onSearchClick);
  document.getElementById("addBtn").addEventListener("click", onAddClick);
  document.getElementById("saveBtn").addEventListener("click", onSaveClick);
  document.getElementById("deleteBtn").addEventListener("click", onDeleteClick);

  // When category changes in ADD mode, refresh the next id
  document.getElementById("categorySelect").addEventListener("change", () => {
    if (formMode === "add") setNextIdFromCategory();
  });
});

/* ---------------- buttons ---------------- */
function onSearchClick() {
  clearPackageForm();
  setFormForSearch();
  initPackageDropdown();
}

function onAddClick() {
  setFormForAdd();
  setNextIdFromCategory();
}

async function onSaveClick() {
  if (formMode !== "add") return;

  const form = document.getElementById("packageForm");

  // front-end validation
  const errors = validatePackageForm(form);
  if (errors.length) {
    alert("Please fix:\n• " + errors.join("\n• "));
    return;
  }

  const payload = buildPayload(form);

  try {
    let resp = await fetch("/api/package/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    let result = await resp.json().catch(() => ({}));
    console.log("first POST status =", resp.status, result);

    if (resp.status === 409 && result.code === "DUPLICATE_PACKAGE") {
      const ok = confirm("A package with the same name and category exists. Save anyway?");
      if (!ok) {
        alert("Save cancelled.");
        return;
      }
      resp = await fetch("/api/package/add?force=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      result = await resp.json().catch(() => ({}));
    }

    if (!resp.ok) {
      throw new Error(result.message || result.error || `HTTP ${resp.status}`);
    }

    alert(`✅ Package ${payload.packageId} added!`);
    form.reset();
    setFormForSearch();
    initPackageDropdown();
  } catch (err) {
    alert(`❌ Error: ${err.message}`);
  }
}

async function onDeleteClick() {
  const select = document.getElementById("packageIdSelect");
  const val = select.value;
  if (!val) return alert("Pick a package to delete.");
  const packageId = val.split(":")[0];

  if (!confirm(`Delete ${packageId}?`)) return;

  const resp = await fetch(`/api/package/delete?packageId=${encodeURIComponent(packageId)}`, {
    method: "DELETE"
  });
  const result = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    alert(`Delete failed: ${result.message || result.error || resp.status}`);
    return;
  }
  alert(`Package ${packageId} deleted`);
  clearPackageForm();
  initPackageDropdown();
}

/* ---------------- helpers ---------------- */

function validatePackageForm(form) {
  const errors = [];
  if (!form.name.value.trim()) errors.push("Package name is required");

  const price = Number(form.price.value);
  if (!form.price.value || isNaN(price) || price < 0) errors.push("Price must be a positive number");

  const sd = new Date(form.startDate.value);
  const ed = new Date(form.endDate.value);
  if (!(sd instanceof Date) || isNaN(sd)) errors.push("Valid start date is required");
  if (!(ed instanceof Date) || isNaN(ed)) errors.push("Valid end date is required");
  if (!errors.length && sd > ed) errors.push("Start date must be before end date");

  const n = form.numClasses.value;
  if (!["1", "4", "10", "unlimited"].includes(n)) {
    errors.push("Number of classes must be 1, 4, 10, or Unlimited");
  }

  return errors;
}

function buildPayload(form) {
  const numRaw = form.numClasses.value;
  const isUnlimited = numRaw === "unlimited";

  return {
    packageId: document.getElementById("packageIdText").value.trim(),
    name: form.name.value.trim(),
    category: form.category.value,
    classType: form.classType.value,
    numClasses: isUnlimited ? "unlimited" : Number(numRaw),
    startDate: form.startDate.value,
    endDate: form.endDate.value,
    price: Number(form.price.value)
  };
}

async function setNextIdFromCategory() {
  const cat = document.getElementById("categorySelect").value || "General";
  try {
    const r = await fetch(`/api/package/getNextId?category=${encodeURIComponent(cat)}`);
    const { nextId } = await r.json();
    document.getElementById("packageIdText").value = nextId;
  } catch (e) {
    console.error("getNextId failed", e);
  }
}

async function initPackageDropdown() {
  const select = document.getElementById("packageIdSelect");
  try {
    const res = await fetch("/api/package/getPackageIds");
    const ids = await res.json();
    select.innerHTML = `<option value="">-- Select Package Id --</option>`;
    ids.forEach(p => {
      const opt = document.createElement("option");
      opt.value = `${p.packageId}:${p.name}`;
      opt.textContent = `${p.packageId}: ${p.name} (${p.category})`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("Failed to load package IDs:", err);
  }
}

function addPackageDropdownListener() {
  const select = document.getElementById("packageIdSelect");
  select.addEventListener("change", async () => {
    const packageId = (select.value || "").split(":")[0];
    if (!packageId) return;

    try {
      const res = await fetch(`/api/package/getPackage?packageId=${encodeURIComponent(packageId)}`);
      if (!res.ok) throw new Error("Package fetch failed");
      const d = await res.json();

      const form = document.getElementById("packageForm");
      document.getElementById("packageIdText").value = d.packageId || "";
      form.name.value       = d.name || "";
      form.category.value   = d.category || "General";
      form.classType.value  = d.classType || "General";
      form.numClasses.value = d.isUnlimited ? "unlimited" : String(d.numClasses ?? "");
      form.price.value      = d.price ?? "";
      form.startDate.value  = d.startDate ? d.startDate.substring(0,10) : "";
      form.endDate.value    = d.endDate   ? d.endDate.substring(0,10)   : "";
    } catch (err) {
      alert(`Error loading ${packageId}: ${err.message}`);
    }
  });
}

function clearPackageForm() {
  document.getElementById("packageForm").reset();
  document.getElementById("packageIdSelect").innerHTML = "";
  document.getElementById("packageIdText").value = "";
}

function setFormForSearch() {
  formMode = "search";
  document.getElementById("packageIdLabel").style.display = "block";
  document.getElementById("packageIdTextLabel").style.display = "none";
  document.getElementById("packageIdText").style.display = "none";
}

function setFormForAdd() {
  formMode = "add";
  document.getElementById("packageIdLabel").style.display = "none";
  document.getElementById("packageIdTextLabel").style.display = "block";
  document.getElementById("packageIdText").style.display = "block";
  document.getElementById("packageForm").reset();
  // default values
  document.getElementById("categorySelect").value = "General";
  document.getElementById("classTypeSelect").value = "General";
  document.getElementById("numClassesSelect").value = "4";
}
