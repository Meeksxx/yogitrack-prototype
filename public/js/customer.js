console.log("customer.js loaded");

let formMode = "search"; // "search" or "add"

document.addEventListener("DOMContentLoaded", () => {
  setFormForSearch();
  initCustomerDropdown();
  addCustomerDropdownListener();
});

/* -------------------- Buttons -------------------- */
document.getElementById("searchBtn").addEventListener("click", () => {
  clearCustomerForm();
  setFormForSearch();
  initCustomerDropdown();
});

document.getElementById("addBtn").addEventListener("click", () => {
  setFormForAdd();
});

document.getElementById("saveBtn").addEventListener("click", onSaveClick);

document.getElementById("deleteBtn").addEventListener("click", async () => {
  const select = document.getElementById("customerIdSelect");
  const val = select.value;
  if (!val) return alert("Pick a customer to delete.");
  const customerId = val.split(":")[0];

  if (!confirm(`Delete ${customerId}?`)) return;

  const resp = await fetch(`/api/customer/delete?customerId=${encodeURIComponent(customerId)}`, {
    method: "DELETE"
  });
  const result = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    alert(`Delete failed: ${result.message || result.error || resp.status}`);
    return;
  }
  alert(`Customer ${customerId} deleted`);
  clearCustomerForm();
  initCustomerDropdown();
});

/* -------------------- Handlers -------------------- */
async function onSaveClick() {
  console.log("Save clicked; formMode =", formMode);
  if (formMode !== "add") return;

  const form = document.getElementById("customerForm");

  // Front-end validation
  const errors = validateCustomerForm(form);
  if (errors.length) {
    alert("Please fix:\n• " + errors.join("\n• "));
    return;
  }

  // Get next ID
  const idRes = await fetch("/api/customer/getNextId");
  if (!idRes.ok) return alert("Could not get next customer id");
  const { nextId } = await idRes.json();
  document.getElementById("customerIdText").value = nextId;

  // Build payload
  const prefEl = form.querySelector('input[name="pref"]:checked');
  const payload = {
    customerId: nextId,
    firstname: form.firstname.value.trim(),
    lastname:  form.lastname.value.trim(),
    address:   form.address.value.trim(),
    phone:     form.phone.value.trim(),
    email:     form.email.value.trim(),
    preferredContact: prefEl ? prefEl.value : "email",
    senior: false
  };

  // POST /add (handle duplicate 409 with confirm)
  try {
    let resp = await fetch("/api/customer/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    let result = await resp.json().catch(() => ({}));
    console.log("first POST status =", resp.status, result);

    if (resp.status === 409 && result.code === "DUPLICATE_NAME") {
      const ok = confirm("A customer with this name already exists. Save anyway?");
      if (!ok) { alert("Save cancelled."); return; }

      resp = await fetch("/api/customer/add?force=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      result = await resp.json().catch(() => ({}));
      console.log("forced POST status =", resp.status, result);
    }

    if (!resp.ok) {
      throw new Error(result.message || result.error || `HTTP ${resp.status}`);
    }

    alert(`✅ Customer ${payload.customerId} added successfully!`);
    form.reset();
    setFormForSearch();
    initCustomerDropdown();
  } catch (err) {
    alert(`❌ Error: ${err.message}`);
  }
}

/* -------------------- Helpers -------------------- */
async function initCustomerDropdown() {
  const select = document.getElementById("customerIdSelect");
  try {
    const res = await fetch("/api/customer/getCustomerIds");
    const ids = await res.json();
    select.innerHTML = `<option value="">-- Select Customer Id --</option>`;
    ids.forEach(c => {
      const fn = c.firstname || "";
      const ln = c.lastname || "";
      const opt = document.createElement("option");
      opt.value = `${c.customerId}:${fn}`;
      opt.textContent = `${c.customerId}:${fn} ${ln}`.trim();
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("Failed to load customer IDs:", err);
  }
}

function addCustomerDropdownListener() {
  const select = document.getElementById("customerIdSelect");
  select.addEventListener("change", async () => {
    const customerId = (select.value || "").split(":")[0];
    if (!customerId) return;

    try {
      const res = await fetch(`/api/customer/getCustomer?customerId=${encodeURIComponent(customerId)}`);
      if (!res.ok) throw new Error("Customer fetch failed");
      const d = await res.json();

      const form = document.getElementById("customerForm");
      form.firstname.value = d.firstname || "";
      form.lastname.value  = d.lastname || "";
      form.address.value   = d.address || "";
      form.phone.value     = d.phone || "";
      form.email.value     = d.email || "";

      const mode = (d.preferredContact || "email").toLowerCase();
      const phoneRadio = form.querySelector('input[name="pref"][value="phone"]');
      const emailRadio = form.querySelector('input[name="pref"][value="email"]');
      if (mode === "phone" && phoneRadio) phoneRadio.checked = true;
      else if (emailRadio) emailRadio.checked = true;
    } catch (err) {
      alert(`Error loading ${customerId}: ${err.message}`);
    }
  });
}

function clearCustomerForm() {
  document.getElementById("customerForm").reset();
  document.getElementById("customerIdSelect").innerHTML = "";
}

function setFormForSearch() {
  formMode = "search";
  document.getElementById("customerIdLabel").style.display = "block";
  document.getElementById("customerIdTextLabel").style.display = "none";
  document.getElementById("customerIdText").style.display = "none";
  document.getElementById("customerIdText").value = "";
  const emailRadio = document.querySelector('input[name="pref"][value="email"]');
  if (emailRadio) emailRadio.checked = true;
}

function setFormForAdd() {
  formMode = "add";
  document.getElementById("customerIdLabel").style.display = "none";
  document.getElementById("customerIdTextLabel").style.display = "block";
  document.getElementById("customerIdText").style.display = "block";
  document.getElementById("customerForm").reset();
  const emailRadio = document.querySelector('input[name="pref"][value="email"]');
  if (emailRadio) emailRadio.checked = true;
}

function validateCustomerForm(form) {
  const errors = [];
  if (!form.firstname.value.trim()) errors.push("First name is required");
  if (!form.lastname.value.trim())  errors.push("Last name is required");
  if (!form.phone.value.trim())     errors.push("Phone is required");
  if (!form.email.value.trim())     errors.push("Email is required");
  const email = form.email.value.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Email looks invalid");
  return errors;
}
