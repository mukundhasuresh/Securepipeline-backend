const express = require("express");
const upload = require("../middleware/uploadMiddleware");
const {
  uploadAndScan,
  getUserScans,
  dashboardStats,
} = require("../controllers/scanController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Upload + Scan
router.post("/upload", protect, upload.single("file"), uploadAndScan);

// Scan history
router.get("/history", protect, getUserScans);

// Dashboard stats (NEW)
router.get("/stats", protect, dashboardStats);

module.exports = router;