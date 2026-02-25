const axios = require("axios");
const User = require("../models/User");

// Step 1: Redirect user to GitHub
exports.connectGithub = (req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo`;

  res.redirect(url);
};

// Step 2: Callback
exports.githubCallback = async (req, res) => {
  try {
    const code = req.query.code;

    if (!code) {
      return res.status(400).json({ message: "No code provided" });
    }

    // Exchange code for token
    const tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: { Accept: "application/json" },
      }
    );

    const accessToken = tokenRes.data.access_token;

    if (!accessToken) {
      return res.status(400).json({ message: "Failed to get access token" });
    }

    // Get GitHub user info
    const userRes = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const githubUsername = userRes.data.login;

    // Save token and username in DB
    await User.findByIdAndUpdate(req.user.id, {
      githubToken: accessToken,
      githubUsername,
    });

    res.json({
      message: "GitHub connected successfully",
      githubUsername,
    });
  } catch (error) {
    console.error("GitHub OAuth error:", error.response?.data || error.message);
    res.status(500).json({ error: "GitHub connection failed" });
  }
};