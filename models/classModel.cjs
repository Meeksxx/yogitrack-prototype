const mongoose = require("mongoose");
require("../config/mongodbconn.cjs");

const slotSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      required: true,
    },
    time: { type: String, match: /^\d{2}:\d{2}$/, required: true }, // "09:00"
    duration: { type: Number, min: 1, required: true },             // minutes
  },
  { _id: false }
);

const classSchema = new mongoose.Schema(
  {
    classId: { type: String, unique: true, index: true }, // A###
    className: { type: String, required: true },
    instructorId: { type: String, required: true },       // "I001"
    classType: { type: String, enum: ["General", "Special"], required: true },
    payRate: { type: Number, default: 0 },
    description: { type: String, default: "" },
    slots: { type: [slotSchema], default: [] },           // weekly schedule
  },
  { collection: "class" }
);

module.exports = mongoose.model("Class", classSchema);
