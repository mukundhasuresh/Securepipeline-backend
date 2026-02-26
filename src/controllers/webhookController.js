const Project = require("../models/Project");
const User = require("../models/User");
const simpleGit = require("simple-git");
const fs = require("fs-extra");
const { exec } = require("child_process");
const path = require("path");
const Scan = require("../models/Scan");

exports.githubWebhook = async (req, res) => {
  try {
    console.log("GitHub Webhook received");

    const event = req.headers["x-github-event"] || "unknown";
    console.log("Event type:", event);

    // Handle ping event (GitHub verification)
    if (event === "ping") {
      console.log("Webhook verified by GitHub");
      return res.status(200).send("Ping OK");
    }

    // Handle push event
    if (event === "push") {
      const repoFullName = req.body?.repository?.full_name;

      if (!repoFullName) {
        console.log("Push event but no repository found");
        return res.status(200).send("No repository info");
      }

      console.log("Push detected for:", repoFullName);

      // Find mapped project
      const project = await Project.findOne({ repoFullName });

      if (!project) {
        console.log("Repository not connected in system");
        return res.status(200).send("Repo not connected");
      }

      // Get user
      const user = await User.findById(project.user);

      if (!user || !user.githubToken) {
        console.log("User or GitHub token missing");
        return res.status(200).send("User not configured");
      }

      // Clone repository
      const clonePath = path.join(
        "uploads",
        "webhook",
        Date.now().toString()
      );

      await fs.mkdirp(clonePath);

      const git = simpleGit();

      const repoUrl = `https://${user.githubToken}@github.com/${repoFullName}.git`;

      console.log("Cloning:", repoFullName);

      await git.clone(repoUrl, clonePath);

      // Run audit in background (non-blocking)
      exec(
        `cd "${clonePath}" && npm install --package-lock-only && npm audit --json`,
        async (error, stdout, stderr) => {
          try {
            if (!stdout) {
              console.log("Audit failed or empty");
              return;
            }

            const jsonStart = stdout.indexOf("{");
            const audit = JSON.parse(stdout.slice(jsonStart));

            await Scan.create({
              user: user._id,
              vulnerabilities:
                audit.vulnerabilities || audit.metadata?.vulnerabilities,
              severity: audit.metadata?.vulnerabilities,
            });

            console.log("Auto scan completed");
          } catch (err) {
            console.error("Audit processing error:", err);
          }
        }
      );

      return res.status(200).send("Push processed");
    }

    console.log("Ignored event:", event);
    return res.status(200).send("Event ignored");
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(200).send("Handled safely");
  }
};