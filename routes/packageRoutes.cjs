const express = require("express");
const router = express.Router();
const pkg = require("../controllers/packageController.cjs");

// read-only helpers
router.get("/getNextId",     pkg.getNextId);
router.get("/getPackage",    pkg.getPackage);
router.get("/getPackageIds", pkg.getPackageIds);

// create
router.post("/add",          pkg.add);

module.exports = router;
