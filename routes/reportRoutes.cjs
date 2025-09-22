// routes/reportRoutes.cjs
const express = require("express");
const router = express.Router();
const report = require("../controllers/reportController.cjs");

router.get("/ping", (_req, res) => res.json({ ok: true }));

router.get("/studioSummary",        report.studioSummary);
router.get("/instructorPerformance",report.instructorPerformance);
router.get("/classAttendance",      report.classAttendance);
router.get("/customerAttendance",   report.customerAttendance);

module.exports = router;
