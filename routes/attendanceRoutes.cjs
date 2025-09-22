const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController.cjs");

router.get("/ping", (_req, res) => res.json({ ok: true }));
router.get("/getNextId", attendanceController.getNextId);
router.get("/classesByInstructor", attendanceController.classesByInstructor);
router.post("/add", attendanceController.add);

module.exports = router;
