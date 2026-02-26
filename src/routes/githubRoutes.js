const express = require("express");
const {
  connectGithub,
  githubCallback,
  scanRepo,
  selectRepo,
} = require("../controllers/githubController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// User must be logged in to connect GitHub
router.get("/connect", protect, connectGithub);

// Callback must also be protected so req.user exists
router.get("/callback", protect, githubCallback);

// Save selected repository
router.post("/select-repo", protect, selectRepo);

// Scan GitHub repository
router.post("/scan", protect, scanRepo);

module.exports = router;