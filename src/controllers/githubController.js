const axios = require("axios");

// Step 1: Redirect user to GitHub
exports.connectGithub = (req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo`;

  res.redirect(url);
};

// Step 2: Callback
exports.githubCallback = async (req, res) => {
  try {
    const code = req.query.code;

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

    // TODO: store in DB later
    res.json({ message: "GitHub connected", accessToken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};