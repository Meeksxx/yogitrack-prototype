const mongoose = require("mongoose");
require("../config/mongodbconn.cjs");

const customerSchema = new mongoose.Schema(
  {
    customerId: { type: String, unique: true, index: true },
    firstname: String,
    lastname: String,
    firstName: String, // tolerate legacy
    lastName: String,  // tolerate legacy
    address: String,
    phone: String,
    email: String,
    preferredContact: { type: String, enum: ["phone", "email"], default: "email" },
    senior: { type: Boolean, default: false },
    classBalance: { type: Number, default: 0 },
    normName: { type: String, index: true } // "kelly nguyen"
  },
  { collection: "customer" }
);

module.exports = mongoose.model("Customer", customerSchema);
