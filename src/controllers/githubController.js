const axios = require("axios");
const User = require("../models/User");
const simpleGit = require("simple-git");
const fs = require("fs-extra");
const { exec } = require("child_process");
const path = require("path");
const Scan = require("../models/Scan");

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

    const tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } }
    );

    const accessToken = tokenRes.data.access_token;

    if (!accessToken) {
      return res.status(400).json({ message: "Failed to get access token" });
    }

    const userRes = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const githubUsername = userRes.data.login;

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

// Step 3: Scan GitHub repository
exports.scanRepo = async (req, res) => {
  try {
    const { repo } = req.body;

    if (!repo) {
      return res.status(400).json({ message: "Repository name required" });
    }

    const user = await User.findById(req.user.id);

    if (!user.githubToken) {
      return res.status(400).json({ message: "GitHub not connected" });
    }

    const clonePath = path.join("uploads", "repos", Date.now().toString());

    await fs.mkdirp(clonePath);

    const git = simpleGit();

    // NOTE: token-based clone
    const repoUrl = `https://${user.githubToken}@github.com/${user.githubUsername}/${repo}.git`;

    console.log("Cloning repo:", repoUrl);

    await git.clone(repoUrl, clonePath);

    // Check if Node project
    const packagePath = path.join(clonePath, "package.json");

    if (!fs.existsSync(packagePath)) {
      return res.status(400).json({
        message: "Repository is not a Node.js project",
      });
    }

    // Generate lockfile + audit
    exec(
      `cd "${clonePath}" && npm i --package-lock-only && npm audit --json`,
      async (error, stdout, stderr) => {
        try {
          if (stderr) console.log(stderr);

          if (!stdout) {
            return res.status(500).json({
              error: "Audit failed",
            });
          }

          // Extract JSON safely
          const jsonStart = stdout.indexOf("{");
          const audit = JSON.parse(stdout.slice(jsonStart));

          const scan = await Scan.create({
            user: req.user.id,
            vulnerabilities:
              audit.vulnerabilities || audit.metadata?.vulnerabilities,
            severity: audit.metadata?.vulnerabilities,
          });

          res.json({
            message: "Repository scanned successfully",
            scan,
          });
        } catch (err) {
          console.error("Audit parse error:", err);
          res.status(500).json({ error: "Audit processing failed" });
        }
      }
    );
  } catch (error) {
    console.error("Repo scan error:", error);
    res.status(500).json({ error: error.message });
  }
};