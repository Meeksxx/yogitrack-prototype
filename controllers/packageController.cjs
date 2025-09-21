const Package = require("../models/packageModel.cjs");


// ---------- helpers ----------
async function computeNextId(category = "General") {
  // Prefix: P### for General, S### for Senior
  const prefix = category === "Senior" ? "S" : "P";
  const last = await Package.find({ packageId: new RegExp("^" + prefix) })
    .sort({ packageId: -1 })
    .limit(1);

  let n = 0;
  if (last.length > 0) {
    const m = String(last[0].packageId).match(/(\d+)$/);
    if (m) n = parseInt(m[1], 10);
  }
  return `${prefix}${String(n + 1).padStart(3, "0")}`;
}

// GET /api/package/getNextId?category=General|Senior
async function getNextId(req, res) {
  try {
    const nextId = await computeNextId(req.query.category || "General");
    res.json({ nextId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// POST /api/package/add
// Body: { name, category, classType, numClasses: 1|4|10|"unlimited", startDate, endDate, price }
async function add(req, res) {
  try {
    // normalize inputs
    const name      = String(req.body.name || req.body.packageName || "").trim();
    const category  = req.body.category === "Senior" ? "Senior" : "General";
    const classType = req.body.classType === "Special" ? "Special" : "General";
    const price     = Number(req.body.price);

    const numClassesRaw = (req.body.numClasses ?? "").toString().toLowerCase();
    const isUnlimited   = numClassesRaw === "unlimited" || numClassesRaw === "0";
    const numClasses    = isUnlimited ? null : Number(req.body.numClasses);

    const startDate = new Date(req.body.startDate);
    const endDate   = new Date(req.body.endDate);

    // validation
    const errors = [];
    if (!name) errors.push("Package name is required");
    if (!price || isNaN(price) || price < 0) errors.push("Price must be a positive number");
    if (!(startDate instanceof Date) || isNaN(startDate)) errors.push("Valid start date is required");
    if (!(endDate   instanceof Date) || isNaN(endDate))   errors.push("Valid end date is required");
    if (!isUnlimited && (isNaN(numClasses) || ![1, 4, 10].includes(numClasses))) {
      errors.push("Number of classes must be 1, 4, or 10 (or 'unlimited')");
    }
    if (!errors.length && startDate > endDate) {
      errors.push("Start date must be before end date");
    }
    if (errors.length) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    // duplicate: same name + category
    const exists = await Package.findOne({
      name: new RegExp("^\\s*" + name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&") + "\\s*$", "i"),
      category
    });
    if (exists && req.query.force !== "true") {
      return res.status(409).json({
        code: "DUPLICATE_PACKAGE",
        message: "A package with the same name and category already exists. Save anyway?"
      });
    }

    // id
    const packageId = req.body.packageId || (await computeNextId(category));

    const doc = await Package.create({
      packageId,
      name,
      category,
      classType,
      numClasses,
      isUnlimited,
      startDate,
      endDate,
      price
    });

    res.status(201).json({ message: "Package added", pkg: doc });
  } catch (err) {
    console.error("Package add error:", err);
    res.status(500).json({ message: "Failed to add package", error: err.message });
  }
}

// GET /api/package/getPackageIds
async function getPackageIds(_req, res) {
  try {
    const list = await Package.find({}, { _id: 0, packageId: 1, name: 1, category: 1 })
      .sort({ packageId: 1 });
    res.json(list);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

// GET /api/package/getPackage?packageId=P001
async function getPackage(req, res) {
  try {
    const id = req.query.packageId;
    const doc = await Package.findOne({ packageId: id });
    if (!doc) return res.status(404).json({ message: "Package not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

// DELETE /api/package/delete?packageId=P001
async function deletePackage(req, res) {
  try {
    const id = req.query.packageId;
    const result = await Package.findOneAndDelete({ packageId: id });
    if (!result) return res.status(404).json({ message: "Package not found" });
    res.json({ message: "Package deleted", packageId: id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = {
  getNextId,
  add,
  getPackageIds,
  getPackage,
  deletePackage
};
