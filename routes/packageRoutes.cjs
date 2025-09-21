const express = require("express");
const router = express.Router();
const pkg = require("../controllers/packageController.cjs");

router.get("/getNextId", pkg.getNextId);
router.post("/add", pkg.add);
router.get("/getPackageIds", pkg.getPackageIds);
router.get("/getPackage", pkg.getPackage);
router.delete("/delete", pkg.deletePackage);

module.exports = router;
