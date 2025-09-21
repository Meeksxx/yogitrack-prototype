// controllers/instructorController.cjs
const Instructor = require("../models/instructorModel.cjs");

// utility: normalize name for duplicate checks
const norm = (s) => String(s || "").trim().toLowerCase();
const normName = (first, last) => `${norm(first)}|${norm(last)}`;

// -----------------------------------------------------
// GET /api/instructor/search?firstname=Sam
exports.search = async (req, res) => {
  try {
    const searchString = req.query.firstname || "";
    const list = await Instructor.find(
      { firstname: { $regex: searchString, $options: "i" } },
      { _id: 0 }
    ).lean();
    if (!list || list.length === 0) {
      return res.status(404).json({ message: "No instructor found" });
    }
    res.json(list);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// -----------------------------------------------------
// GET /api/instructor/getInstructor?instructorId=I001
exports.getInstructor = async (req, res) => {
  try {
    const instructorId = req.query.instructorId;
    const item = await Instructor.findOne({ instructorId }, { _id: 0 }).lean();
    res.json(item || {});
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// -----------------------------------------------------
// POST /api/instructor/add[?force=true]
exports.add = async (req, res) => {
  try {
    const {
      instructorId,
      firstname,
      lastname,
      address = "",
      phone = "",
      email = "",
      preferredContact = "email",
    } = req.body;

    if (!instructorId || !firstname || !lastname) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // duplicate by normalized name
    const existing = await Instructor.findOne({
      $expr: {
        $eq: [
          { $concat: [{ $toLower: "$firstname" }, "|", { $toLower: "$lastname" }] },
          normName(firstname, lastname),
        ],
      },
    }).lean();

    if (existing && req.query.force !== "true") {
      return res
        .status(409)
        .json({ code: "DUPLICATE_NAME", message: "An instructor with the same name exists." });
    }

    const doc = new Instructor({
      instructorId,
      firstname,
      lastname,
      address,
      phone,
      email,
      preferredContact,
    });

    await doc.save();
    res.status(201).json({ message: "Instructor added successfully", instructor: doc });
  } catch (err) {
    console.error("Error adding instructor:", err);
    res.status(500).json({ message: "Failed to add instructor", error: err.message });
  }
};

// -----------------------------------------------------
// GET /api/instructor/getInstructorIds
exports.getInstructorIds = async (_req, res) => {
  try {
    const docs = await Instructor.find(
      {},
      { _id: 0, instructorId: 1, firstname: 1, lastname: 1 }
    )
      .sort({ instructorId: 1 })
      .lean();

    // coalesce & filter
    const list = docs
      .map((d) => ({
        instructorId: d.instructorId,
        firstname: d.firstname || d.firstName || "",
        lastname: d.lastname || d.lastName || "",
      }))
      .filter((d) => d.instructorId && d.firstname && d.lastname);

    res.json(list);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// -----------------------------------------------------
// GET /api/instructor/getNextId
exports.getNextId = async (_req, res) => {
  try {
    const last = await Instructor.find({ instructorId: { $regex: /^I\d+$/ } })
      .sort({ instructorId: -1 })
      .limit(1)
      .lean();

    let n = 0;
    if (last.length) {
      const m = String(last[0].instructorId).match(/\d+$/);
      if (m) n = parseInt(m[0], 10);
    }
    const nextId = `I${String(n + 1).padStart(3, "0")}`;
    res.json({ nextId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// -----------------------------------------------------
// DELETE /api/instructor/deleteInstructor?instructorId=I001
exports.deleteInstructor = async (req, res) => {
  try {
    const { instructorId } = req.query;
    const result = await Instructor.findOneAndDelete({ instructorId });
    if (!result) {
      return res.status(404).json({ error: "Instructor not found" });
    }
    res.json({ message: "Instructor deleted", instructorId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
