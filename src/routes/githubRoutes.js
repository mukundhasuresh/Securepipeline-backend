const express = require("express");
const {
  connectGithub,
  githubCallback,
} = require("../controllers/githubController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/connect", connectGithub);
router.get("/callback", githubCallback);

module.exports = router;