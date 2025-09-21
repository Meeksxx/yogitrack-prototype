// models/packageModel.cjs
const mongoose = require("mongoose");
require("../config/mongodbconn.cjs");

// Use-case fields recap:
// - packageId: generated (P### for General, S### for Senior)
// - name: e.g., "4 Class Pass"
// - category: "General" | "Senior"
// - classType: "General" | "Special"
// - numClasses: 1 | 4 | 10 | null (null means unlimited)
// - isUnlimited: convenience flag derived from numClasses
// - startDate, endDate, price

const packageSchema = new mongoose.Schema(
  {
    packageId: { type: String, unique: true, index: true },
    name:      { type: String, required: true },
    category:  { type: String, enum: ["General", "Senior"], required: true },
    classType: { type: String, enum: ["General", "Special"], required: true },

    numClasses: { type: Number, default: null }, // null => unlimited
    isUnlimited:{ type: Boolean, default: false },

    startDate:  { type: Date, required: true },
    endDate:    { type: Date, required: true },
    price:      { type: Number, required: true }
  },
  { collection: "package" }
);

// keep isUnlimited in sync
packageSchema.pre("validate", function (next) {
  this.isUnlimited = this.numClasses === null || this.numClasses === undefined;
  next();
});

module.exports = mongoose.model("Package", packageSchema);
