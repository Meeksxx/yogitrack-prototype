const mongoose = require("mongoose");
require("../config/mongodbconn.cjs");

const saleSchema = new mongoose.Schema(
  {
    saleId:      { type: String, index: true, unique: true },
    customerId:  { type: String, required: true },
    packageId:   { type: String, required: true },
    amountPaid:  { type: Number, required: true },
    paymentMode: { type: String, enum: ["cash","card","check","zelle","venmo","other"], required: true },
    startDate:   { type: Date, required: true },
    endDate:     { type: Date, required: true },
    createdAt:   { type: Date, default: Date.now }
  },
  { collection: "sale" }
);

module.exports = mongoose.model("Sale", saleSchema);
