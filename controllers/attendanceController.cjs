const Attendance = require("../models/attendanceModel.cjs");
const Class      = require("../models/classModel.cjs");
const Customer   = require("../models/customerModel.cjs");
const Package    = require("../models/packageModel.cjs");
const notifier   = require("../services/notifier.cjs");

function parseIdSuffix(s) {
  const m = String(s || "").match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

// GET /api/attendance/getNextId
exports.getNextId = async (_req, res) => {
  try {
    const last = await Attendance.find({}).sort({ attendanceId: -1 }).limit(1);
    let n = last.length ? parseIdSuffix(last[0].attendanceId) : 0;
    res.json({ nextId: `A${String(n + 1).padStart(3, "0")}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/attendance/classesByInstructor?instructorId=I001
exports.classesByInstructor = async (req, res) => {
  try {
    const { instructorId } = req.query || {};
    if (!instructorId) return res.status(400).json({ message: "Missing instructorId" });
    const rows = await Class.find({ instructorId }).select({ _id:0, classId:1, day:1, time:1, classType:1 });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// helper: does selected datetime align with scheduled day/time?
function scheduleMismatch(klass, when) {
  if (!klass || !klass.day || !klass.time) return false;
  try {
    const d = new Date(when);
    if (Number.isNaN(d.getTime())) return true;

    // Compare weekday and HH:MM (simple check)
    const weekdays = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const dow = weekdays[d.getDay()];
    const hhmm = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    const timePrefix = (klass.time || "").slice(0,5); // assuming "HH:MM ..." format in seed
    return (dow !== klass.day) || (timePrefix !== hhmm);
  } catch {
    return true;
  }
}

// POST /api/attendance/add?force=true|false
// body: { classId, instructorId, when, attendees:[{customerId}] }
exports.add = async (req, res) => {
  try {
    const { classId, instructorId, when, attendees = [] } = req.body || {};
    const force = String(req.query.force || "false").toLowerCase() === "true";

    if (!classId || !instructorId || !when || !Array.isArray(attendees) || attendees.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const klass = await Class.findOne({ classId });
    if (!klass) return res.status(404).json({ message: `Class ${classId} not found` });
    if (klass.instructorId && klass.instructorId !== instructorId) {
      return res.status(400).json({ message: "Instructor does not lead this class" });
    }

    // If date/time doesn’t match scheduled slot, return a warning flag (client will confirm)
    const warn = scheduleMismatch(klass, when);

    // Validate balances
    const insufficient = [];
    const customers = await Customer.find({ customerId: { $in: attendees.map(a => a.customerId) } });
    const customerMap = new Map(customers.map(c => [c.customerId, c]));
    attendees.forEach(a => {
      const c = customerMap.get(a.customerId);
      const bal = Number(c?.classBalance ?? 0);
      if (bal < 1) insufficient.push({ customerId: a.customerId, balance: bal });
    });

    if ((insufficient.length > 0 || warn) && !force) {
      return res.status(409).json({
        code: "NEEDS_CONFIRM",
        warnSchedule: warn,
        insufficient
      });
    }

    // Save attendance
    const last = await Attendance.find({}).sort({ attendanceId: -1 }).limit(1);
    const next = `A${String(parseIdSuffix(last[0]?.attendanceId) + 1).padStart(3, "0")}`;
    const whenDate = new Date(when);
    const doc = new Attendance({ attendanceId: next, classId, instructorId, when: whenDate, attendees });
    await doc.save();

    // Decrement balances (allow negative if forced)
    for (const a of attendees) {
      await Customer.updateOne({ customerId: a.customerId }, { $inc: { classBalance: -1 } });
    }

    // Send confirmations (mock)
    for (const a of attendees) {
      const c = customerMap.get(a.customerId);
      if (!c) continue;
      const mode = (c.preferredContact || "email").toLowerCase();
      const to = mode === "phone" ? c.phone : c.email;
      const msg = `Hello ${c.firstname}! You are checked-in for a class on ${new Date(whenDate).toLocaleString()}. Your class-balance is ${Number((c.classBalance ?? 0) - 1)}.`;
      await notifier.send(to || "(unknown)", mode, msg);
    }

    res.status(201).json({ message: "Attendance saved", attendance: doc, warnSchedule: warn });
  } catch (err) {
    console.error("Error saving attendance:", err);
    res.status(500).json({ message: "Failed to save attendance", error: err.message });
  }
};
