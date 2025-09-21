// models/instructorModel.cjs
const mongoose = require("mongoose");
require("../config/mongodbconn.cjs");

const instructorSchema = new mongoose.Schema(
  {
    instructorId:     { type: String, required: true, index: true, unique: true },
    firstname:        { type: String, required: true },
    lastname:         { type: String, required: true },
    address:          { type: String, default: "" },
    phone:            { type: String, default: "" },
    email:            { type: String, default: "" },
    preferredContact: { type: String, enum: ["phone", "email"], default: "email" },
  },
  { collection: "instructor" }
);

module.exports = mongoose.model("Instructor", instructorSchema);
