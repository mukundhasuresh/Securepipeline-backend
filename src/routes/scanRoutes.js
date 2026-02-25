const express = require("express");
const upload = require("../middleware/uploadMiddleware");
const {
  uploadAndScan,
  getUserScans,
} = require("../controllers/scanController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Upload + Scan
router.post("/upload", protect, upload.single("file"), uploadAndScan);

// Scan history
router.get("/history", protect, getUserScans);

module.exports = router;