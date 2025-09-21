const Package = require("../models/packageModel.cjs");

const norm = (s) => String(s || "").trim().toLowerCase();

// GET /api/package/getNextId?category=General|Senior
async function getNextId(req, res) {
  try {
    const category = (req.query.category || "General").toString();
    const prefix = category === "Senior" ? "S" : "P";

    const last = await Package.find({ packageId: { $regex: `^${prefix}\\d+$` } })
      .sort({ packageId: -1 })
      .limit(1)
      .lean();

    let n = 0;
    if (last.length) {
      const m = String(last[0].packageId).match(/\d+$/);
      if (m) n = parseInt(m[0], 10);
    }
    res.json({ nextId: `${prefix}${String(n + 1).padStart(3, "0")}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// POST /api/package/add[?force=true]
async function add(req, res) {
  try {
    const {
      packageId, name, category, classType,
      numClasses = 0, isUnlimited = false,
      startDate, endDate, price
    } = req.body;

    if (!packageId || !name || !category || !classType || !startDate || !endDate || price == null) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ message: "Start date cannot be after end date" });
    }

    // duplicate by (name + category)
    const dup = await Package.findOne({
      $expr: {
        $eq: [
          { $concat: [{ $toLower: "$name" }, "|", { $toLower: "$category" }] },
          `${norm(name)}|${norm(category)}`
        ]
      }
    }).lean();

    if (dup && req.query.force !== "true") {
      return res.status(409).json({ code: "DUPLICATE_NAME", message: "A package with the same name & category exists." });
    }

    const doc = new Package({
      packageId, name, category, classType,
      numClasses: isUnlimited ? 0 : Number(numClasses || 0),
      isUnlimited: !!isUnlimited,
      startDate, endDate,
      price: Number(price)
    });

    await doc.save();
    res.status(201).json({ message: "Package added", pkg: doc });
  } catch (e) {
    console.error("Add package error:", e);
    res.status(500).json({ error: e.message });
  }
}

// GET /api/package/getPackage?packageId=P001
async function getPackage(req, res) {
  try {
    const pkg = await Package.findOne({ packageId: req.query.packageId }, { _id: 0 }).lean();
    res.json(pkg || {});
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

// GET /api/package/getPackageIds
async function getPackageIds(_req, res) {
  try {
    const list = await Package.find({}, { _id: 0, packageId: 1, name: 1, category: 1 })
      .sort({ packageId: 1 })
      .lean();
    res.json(list);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

module.exports = { getNextId, add, getPackage, getPackageIds };
