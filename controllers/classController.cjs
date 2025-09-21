const Class = require("../models/classModel.cjs");

// ---------- helpers ----------
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const toMin = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
};
const overlap = (a, b) => {
  if (a.day !== b.day) return false;
  const aStart = toMin(a.time);
  const aEnd = aStart + a.duration;
  const bStart = toMin(b.time);
  const bEnd = bStart + b.duration;
  return aStart < bEnd && bStart < aEnd;
};

async function computeNextId() {
  const last = await Class.find({}).sort({ classId: -1 }).limit(1);
  let n = 0;
  if (last.length) {
    const m = String(last[0].classId).match(/(\d+)$/);
    if (m) n = parseInt(m[1], 10);
  }
  return `A${String(n + 1).padStart(3, "0")}`;
}

// Find a few non-conflicting alternatives for a single slot
async function suggestAlternatives(slot, excludeId = null) {
  const all = await Class.find(
    excludeId ? { classId: { $ne: excludeId } } : {}
  ).lean();

  const suggestions = [];
  const startHour = 6, endHour = 21; // studio hours
  // same day scan in 15-min steps
  for (let minutes = startHour * 60; minutes <= endHour * 60; minutes += 15) {
    const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mm = String(minutes % 60).padStart(2, "0");
    const trySlot = { ...slot, time: `${hh}:${mm}` };

    const conflict = all.some((c) =>
      (c.slots || []).some((s) => overlap(trySlot, s))
    );
    if (!conflict) {
      suggestions.push(trySlot);
      if (suggestions.length >= 3) break;
    }
  }

  // if none on same day, try same time next day
  if (!suggestions.length) {
    const idx = DAYS.indexOf(slot.day);
    const nextDay = DAYS[(idx + 1) % 7];
    suggestions.push({ ...slot, day: nextDay });
  }
  return suggestions;
}

// ---------- routes ----------

// GET /api/class/getNextId
exports.getNextId = async (_req, res) => {
  try {
    const nextId = await computeNextId();
    res.json({ nextId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/class/add
// Body: { className, instructorId, classType, payRate, description, slots:[{day,time,duration},...] }
exports.add = async (req, res) => {
  try {
    const {
      classId,
      className,
      instructorId,
      classType = "General",
      payRate = 0,
      description = "",
      slots = [],
    } = req.body || {};

    // basic validation
    const errors = [];
    if (!className?.trim()) errors.push("Class name is required");
    if (!instructorId?.trim()) errors.push("Instructor Id is required");
    if (!["General", "Special"].includes(classType)) errors.push("Invalid class type");
    if (!Array.isArray(slots) || !slots.length) errors.push("At least one schedule slot is required");

    for (const s of slots) {
      if (!DAYS.includes(s.day)) errors.push(`Invalid day: ${s.day}`);
      if (!/^\d{2}:\d{2}$/.test(s.time)) errors.push(`Invalid time: ${s.time}`);
      if (Number(s.duration) <= 0) errors.push("Duration must be positive");
    }
    if (errors.length) return res.status(400).json({ message: "Validation failed", errors });

    // conflict check
    const all = await Class.find({}).lean();
    const conflicts = [];
    for (const s of slots) {
      for (const c of all) {
        for (const es of c.slots || []) {
          if (overlap(s, es)) {
            conflicts.push({
              slot: s,
              with: { classId: c.classId, className: c.className, day: es.day, time: es.time },
            });
          }
        }
      }
    }
    if (conflicts.length) {
      // suggest alternatives for the first conflicting slot
      const suggestions = await suggestAlternatives(conflicts[0].slot);
      return res.status(409).json({
        code: "SCHEDULE_CONFLICT",
        message: "This time overlaps an existing class.",
        conflicts,
        suggestions,
      });
    }

    const newId = classId || (await computeNextId());
    const doc = await Class.create({
      classId: newId,
      className: className.trim(),
      instructorId: instructorId.trim(),
      classType,
      payRate: Number(payRate) || 0,
      description: String(description || ""),
      slots: slots.map((s) => ({
        day: s.day,
        time: s.time,
        duration: Number(s.duration),
      })),
    });

    res.status(201).json({ message: "Class added", class: doc });
  } catch (err) {
    console.error("Class add error:", err);
    res.status(500).json({ message: "Failed to add class", error: err.message });
  }
};

// GET /api/class/getClassIds
exports.getClassIds = async (_req, res) => {
  try {
    const list = await Class.find({}, { _id: 0, classId: 1, className: 1 }).sort({ classId: 1 });
    res.json(list);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// GET /api/class/getClass?classId=A001
exports.getClass = async (req, res) => {
  try {
    const id = req.query.classId;
    const doc = await Class.findOne({ classId: id });
    if (!doc) return res.status(404).json({ message: "Class not found" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

// DELETE /api/class/delete?classId=A001
exports.deleteClass = async (req, res) => {
  try {
    const id = req.query.classId;
    const result = await Class.findOneAndDelete({ classId: id });
    if (!result) return res.status(404).json({ message: "Class not found" });
    res.json({ message: "Class deleted", classId: id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
