const express = require("express");
const router = express.Router();
const { analyzeAndSave, getLatestAnalysis } = require("../controllers/analysisController");

router.post("/", analyzeAndSave);
router.get("/", getLatestAnalysis);

module.exports = router;