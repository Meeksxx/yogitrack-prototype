const express = require("express");
const router = express.Router();
const cls = require("../controllers/classController.cjs");

router.get("/getNextId", cls.getNextId);
router.post("/add", cls.add);
router.get("/getClassIds", cls.getClassIds);
router.get("/getClass", cls.getClass);
router.delete("/delete", cls.deleteClass);

module.exports = router;
