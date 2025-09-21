// routes/instructorRoutes.cjs
const express = require("express");
const router = express.Router();
const instructorController = require("../controllers/instructorController.cjs");

router.get("/getInstructor", instructorController.getInstructor);
router.get("/getNextId", instructorController.getNextId);
router.post("/add", instructorController.add);
router.get("/getInstructorIds", instructorController.getInstructorIds);
router.delete("/deleteInstructor", instructorController.deleteInstructor);

// (optional) fuzzy search by first name
router.get("/search", instructorController.search);

module.exports = router;
