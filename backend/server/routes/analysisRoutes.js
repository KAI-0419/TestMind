const express = require("express");
const router = express.Router();
const {
  analyzeAndSave,
  getLatestAnalysis,
  mergeGuest,
} = require("../controllers/analysisController");

router.post("/", analyzeAndSave);
router.get("/", getLatestAnalysis);
router.post("/mergeGuest", mergeGuest);

module.exports = router;