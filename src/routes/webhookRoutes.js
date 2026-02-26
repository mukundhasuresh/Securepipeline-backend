const express = require("express");
const { githubWebhook } = require("../controllers/webhookController");

const router = express.Router();

router.post("/github", githubWebhook);

module.exports = router;