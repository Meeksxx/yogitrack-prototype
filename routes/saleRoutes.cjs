const express = require("express");
const router  = express.Router();
const saleController = require("../controllers/saleController.cjs");

router.get("/ping", (_req, res) => res.json({ ok: true }));      // debug helper
router.get("/getNextId", saleController.getNextId);
router.post("/add",       saleController.add);

module.exports = router;   // <-- must be exports (not exprots)
