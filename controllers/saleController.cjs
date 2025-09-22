// controllers/saleController.cjs
const Sale     = require("../models/saleModel.cjs");
const Customer = require("../models/customerModel.cjs");
const Package  = require("../models/packageModel.cjs");

// GET /api/sale/getNextId
exports.getNextId = async (_req, res) => {
  try {
    const last = await Sale.find({}).sort({ saleId: -1 }).limit(1);
    let n = 0;
    if (last.length > 0) {
      const m = String(last[0].saleId || "").match(/(\d+)$/);
      if (m) n = parseInt(m[1], 10);
    }
    const nextId = `S${String(n + 1).padStart(3, "0")}`;
    res.json({ nextId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/sale/add
exports.add = async (req, res) => {
  try {
    const {
      saleId,
      customerId,
      packageId,
      amountPaid,
      paymentMode,
      startDate,
      endDate,
    } = req.body || {};

    if (!customerId || !packageId || amountPaid == null || !startDate || !endDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    if (Number.isNaN(sDate.getTime()) || Number.isNaN(eDate.getTime())) {
      return res.status(400).json({ message: "Invalid start/end date" });
    }

    const customer = await Customer.findOne({ customerId });
    if (!customer) return res.status(404).json({ message: `Customer ${customerId} not found` });

    const pkg = await Package.findOne({ packageId });
    if (!pkg) return res.status(404).json({ message: `Package ${packageId} not found` });

    // Auto-generate saleId if missing
    let finalSaleId = saleId;
    if (!finalSaleId) {
      const last = await Sale.find({}).sort({ saleId: -1 }).limit(1);
      let n = 0;
      if (last.length > 0) {
        const m = String(last[0].saleId || "").match(/(\d+)$/);
        if (m) n = parseInt(m[1], 10);
      }
      finalSaleId = `S${String(n + 1).padStart(3, "0")}`;
    }

    const sale = new Sale({
      saleId: finalSaleId,
      customerId,
      packageId,
      amountPaid,
      paymentMode: (paymentMode || "cash").toLowerCase(),
      startDate: sDate,
      endDate: eDate,
    });
    await sale.save();

    if (typeof pkg.numClasses === "number" && !pkg.isUnlimited) {
      await Customer.updateOne(
        { customerId },
        { $inc: { classBalance: pkg.numClasses } }
      );
    }

    res.status(201).json({ message: "Sale recorded successfully", sale });
  } catch (err) {
    console.error("Error recording sale:", err);
    res.status(500).json({ message: "Failed to record sale", error: err.message });
  }
};
