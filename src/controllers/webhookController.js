const Project = require("../models/Project");
const User = require("../models/User");
const simpleGit = require("simple-git");
const fs = require("fs-extra");
const { exec } = require("child_process");
const path = require("path");
const Scan = require("../models/Scan");
const { sendAlert } = require("../utils/email");

// Score calculation
const calculateScore = (severity = {}) => {
  const critical = severity.critical || 0;
  const high = severity.high || 0;
  const moderate = severity.moderate || 0;
  const low = severity.low || 0;

  let deduction =
    critical * 10 + high * 7 + moderate * 4 + low * 1;

  let score = Math.max(0, 100 - deduction);

  let riskLevel = "Low";

  if (score < 40) riskLevel = "Critical";
  else if (score < 60) riskLevel = "High";
  else if (score < 80) riskLevel = "Medium";

  return { score, riskLevel };
};

// Recursive search for package.json
const findPackageJson = async (dir) => {
  const files = await fs.readdir(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      const result = await findPackageJson(fullPath);
      if (result) return result;
    } else if (file === "package.json") {
      return fullPath;
    }
  }
  return null;
};

exports.githubWebhook = async (req, res) => {
  try {
    console.log("GitHub Webhook received");

    const event = req.headers["x-github-event"] || "unknown";
    console.log("Event type:", event);

    // GitHub verification
    if (event === "ping") {
      console.log("Webhook verified by GitHub");
      return res.status(200).send("Ping OK");
    }

    // Push event
    if (event === "push") {
      const repoFullName = req.body?.repository?.full_name;

      if (!repoFullName) {
        console.log("No repository info");
        return res.status(200).send("No repository info");
      }

      console.log("Push detected for:", repoFullName);

      // Find project mapping
      const project = await Project.findOne({ repoFullName });

      if (!project) {
        console.log("Repository not connected");
        return res.status(200).send("Repo not connected");
      }

      // Get user
      const user = await User.findById(project.user);

      if (!user || !user.githubToken) {
        console.log("User or GitHub token missing");
        return res.status(200).send("User not configured");
      }

      // Clone repo
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

      // Find Node project
      const packagePath = await findPackageJson(clonePath);

      if (!packagePath) {
        console.log("No Node project found");
        return res.status(200).send("No Node project found");
      }

      const projectDir = path.dirname(packagePath);

      // Run audit
      exec(
        `cd "${projectDir}" && npm install --package-lock-only && npm audit --json`,
        async (error, stdout) => {
          try {
            if (!stdout) {
              console.log("Audit failed or empty");
              return;
            }

            const jsonStart = stdout.indexOf("{");
            const audit = JSON.parse(stdout.slice(jsonStart));

            const vulnerabilities =
              audit.vulnerabilities ||
              audit.metadata?.vulnerabilities ||
              {};

            const severity = audit.metadata?.vulnerabilities || {};

            const { score, riskLevel } = calculateScore(severity);

            // Send alert for High or Critical risk
            if (riskLevel === "High" || riskLevel === "Critical") {
              if (user.email) {
                await sendAlert(user.email, score, riskLevel);
              }
            }

            await Scan.create({
              user: user._id,
              vulnerabilities,
              severity,
              securityScore: score,
              riskLevel,
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