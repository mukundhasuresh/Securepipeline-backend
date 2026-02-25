const express = require("express");
const {
  connectGithub,
  githubCallback,
} = require("../controllers/githubController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// User must be logged in to connect GitHub
router.get("/connect", protect, connectGithub);

// Callback must also be protected
router.get("/callback", protect, githubCallback);

module.exports = router;