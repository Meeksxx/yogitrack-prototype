// models/attendanceModel.cjs
const mongoose = require("mongoose");
require("../config/mongodbconn.cjs");

const attendeeSchema = new mongoose.Schema({
  customerId: { type: String, required: true },
  packageId:  { type: String, required: false }, // optional (drop-in, cash, etc.)
  note:       { type: String, required: false },
}, { _id: false });

const attendanceSchema = new mongoose.Schema({
  attendanceId: { type: String, index: true, unique: true },
  classId:      { type: String, required: true },
  instructorId: { type: String, required: true },
  when:         { type: Date,   required: true },
  attendees:    { type: [attendeeSchema], default: [] },
  createdAt:    { type: Date, default: Date.now }
}, { collection: "attendance" });

module.exports = mongoose.model("Attendance", attendanceSchema);
