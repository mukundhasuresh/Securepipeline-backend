const express = require("express");
const upload = require("../middleware/uploadMiddleware");
const { uploadAndScan } = require("../controllers/scanController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/upload", protect, upload.single("file"), uploadAndScan);

module.exports = router;