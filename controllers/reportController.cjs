// controllers/reportController.cjs
const Customer   = require("../models/customerModel.cjs");
const Instructor = require("../models/instructorModel.cjs");
const Class      = require("../models/classModel.cjs");
const Attendance = require("../models/attendanceModel.cjs");
const Sale       = require("../models/saleModel.cjs");

// GET /api/report/studioSummary
exports.studioSummary = async (_req, res) => {
  try {
    const [customers, instructors, classes, attendance, sales] = await Promise.all([
      Customer.countDocuments({}),
      Instructor.countDocuments({}),
      Class.countDocuments({}),
      Attendance.countDocuments({}),
      Sale.countDocuments({})
    ]);
    res.json({ customers, instructors, classes, attendance, sales });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/report/instructorPerformance?instructorId=I001
exports.instructorPerformance = async (req, res) => {
  try {
    const { instructorId } = req.query || {};
    if (!instructorId) return res.status(400).json({ message: "Missing instructorId" });

    const rows = await Attendance.aggregate([
      { $match: { instructorId } },
      { $unwind: "$attendees" },
      { $group: { _id: "$instructorId", checkins: { $sum: 1 } } }
    ]);

    res.json({ instructorId, checkins: rows[0]?.checkins || 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/report/classAttendance?classId=C001
exports.classAttendance = async (req, res) => {
  try {
    const { classId } = req.query || {};
    if (!classId) return res.status(400).json({ message: "Missing classId" });

    const rows = await Attendance.aggregate([
      { $match: { classId } },
      { $unwind: "$attendees" },
      { $group: { _id: "$classId", checkins: { $sum: 1 } } }
    ]);

    res.json({ classId, checkins: rows[0]?.checkins || 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// GET /api/report/customerAttendance?customerId=C001
exports.customerAttendance = async (req, res) => {
  try {
    const { customerId } = req.query || {};
    if (!customerId) return res.status(400).json({ message: "Missing customerId" });

    const rows = await Attendance.aggregate([
      { $unwind: "$attendees" },
      { $match: { "attendees.customerId": customerId } },
      { $group: { _id: "$attendees.customerId", checkins: { $sum: 1 } } }
    ]);

    res.json({ customerId, checkins: rows[0]?.checkins || 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
