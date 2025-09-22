// public/js/sale.js

document.addEventListener("DOMContentLoaded", () => {
  console.log("sale.js loaded");
  initCustomers();
  initPackages();

  document.getElementById("packageSelect").addEventListener("change", onPackageChange);
  document.getElementById("saveBtn").addEventListener("click", onSave);
});

async function initCustomers() {
  const sel = document.getElementById("customerSelect");
  sel.innerHTML = `<option value="">-- Select Customer --</option>`;
  try {
    const r = await fetch("/api/customer/getCustomerIds");
    const list = await r.json();
    list.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.customerId;
      opt.textContent = `${c.customerId}: ${c.firstname} ${c.lastname}`;
      sel.appendChild(opt);
    });
  } catch (e) {
    alert("Failed to load customers: " + e.message);
  }
}

async function initPackages() {
  const sel = document.getElementById("packageSelect");
  sel.innerHTML = `<option value="">-- Select Package --</option>`;
  try {
    const r = await fetch("/api/package/getPackageIds");
    const list = await r.json();
    list.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.packageId;
      opt.textContent = `${p.packageId}: ${p.name} (${p.category})`;
      sel.appendChild(opt);
    });
  } catch (e) {
    alert("Failed to load packages: " + e.message);
  }
}

async function onPackageChange() {
  const pkgId = document.getElementById("packageSelect").value;
  if (!pkgId) return;

  try {
    // You likely already have this route from packages work:
    // GET /api/package/getPackage?packageId=PXYY
    const r = await fetch(`/api/package/getPackage?packageId=${encodeURIComponent(pkgId)}`);
    if (!r.ok) throw new Error("Package lookup failed");
    const pkg = await r.json();

    // Fill read-only fields
    document.getElementById("pkgClassType").value = pkg.classType || "";
    document.getElementById("pkgNumClasses").value = (pkg.isUnlimited ? "Unlimited" : (pkg.numClasses ?? ""));

    // Default amount to package price
    if (typeof pkg.price === "number") {
      document.getElementById("amountPaid").value = pkg.price;
    }

    // Default dates: startDate = today, endDate = package endDate if present
    const today = new Date();
    document.getElementById("startDate").value = toInputDate(today);
    if (pkg.endDate) {
      document.getElementById("endDate").value = toInputDate(new Date(pkg.endDate));
    } else {
      // simple 30-day default if pkg has no specific endDate
      const d = new Date(today);
      d.setDate(d.getDate() + 30);
      document.getElementById("endDate").value = toInputDate(d);
    }
  } catch (e) {
    console.error(e);
    alert("Failed to load package details: " + e.message);
  }
}

function toInputDate(d) {
  // yyyy-mm-dd
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function onSave() {
  const customerId  = document.getElementById("customerSelect").value.trim();
  const packageId   = document.getElementById("packageSelect").value.trim();
  const amountPaid  = Number(document.getElementById("amountPaid").value);
  const paymentMode = document.getElementById("paymentMode").value;
  const startDate   = document.getElementById("startDate").value;
  const endDate     = document.getElementById("endDate").value;

  // front-end checks (the controller also validates)
  const errs = [];
  if (!customerId) errs.push("Pick a customer.");
  if (!packageId) errs.push("Pick a package.");
  if (!Number.isFinite(amountPaid) || amountPaid < 0) errs.push("Amount must be a valid number.");
  if (!startDate) errs.push("Start date is required.");
  if (!endDate) errs.push("End date is required.");
  if (errs.length) { alert("Please fix:\n• " + errs.join("\n• ")); return; }

  try {
    const r = await fetch("/api/sale/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId, packageId, amountPaid, paymentMode, startDate, endDate
      })
    });

    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.message || body.error || `HTTP ${r.status}`);

    alert("✅ Sale recorded. Customer balance updated (if limited package).");
    document.getElementById("saleForm").reset();
    document.getElementById("pkgClassType").value = "";
    document.getElementById("pkgNumClasses").value = "";
  } catch (e) {
    alert("❌ Failed to save: " + e.message);
  }
}
