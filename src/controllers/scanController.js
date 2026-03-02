const unzipper = require("unzipper");
const fs = require("fs-extra");
const { exec } = require("child_process");
const path = require("path");
const Scan = require("../models/Scan");
const User = require("../models/User");
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


// Upload + Scan
exports.uploadAndScan = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const zipPath = req.file.path;
    const extractPath = path.join("uploads", Date.now().toString());

    await fs.mkdir(extractPath);

    // Extract ZIP
    await fs
      .createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: extractPath }))
      .promise();

    console.log("ZIP extracted at:", extractPath);

    // Check package.json
    const packagePath = path.join(extractPath, "package.json");

    if (!fs.existsSync(packagePath)) {
      return res.status(400).json({
        message: "No package.json found in project",
      });
    }

    // Run npm audit
    exec(
      `cd "${extractPath}" && npm i --package-lock-only && npm audit --json`,
      async (error, stdout, stderr) => {
        try {
          if (stderr) console.error("Audit stderr:", stderr);

          if (!stdout) {
            return res.status(500).json({
              error: "No audit output",
            });
          }

          let audit;

          try {
            const jsonStart = stdout.indexOf("{");

            if (jsonStart === -1) {
              return res.json({
                message: "No vulnerabilities found",
              });
            }

            const jsonString = stdout.slice(jsonStart);
            audit = JSON.parse(jsonString);
          } catch (parseError) {
            console.error("JSON parse error:", parseError);
            return res.status(500).json({
              error: "Invalid audit output",
            });
          }

          const vulnerabilities =
            audit.vulnerabilities &&
            Object.keys(audit.vulnerabilities).length > 0
              ? audit.vulnerabilities
              : [];

          const severity = audit.metadata?.vulnerabilities || {};

          const { score, riskLevel } = calculateScore(severity);

          // Send alert if high or critical
          if (riskLevel === "High" || riskLevel === "Critical") {
            const user = await User.findById(req.user.id);
            if (user?.email) {
              await sendAlert(user.email, score, riskLevel);
            }
          }

          const scan = await Scan.create({
            user: req.user.id,
            vulnerabilities,
            severity,
            securityScore: score,
            riskLevel,
          });

          res.json({
            message: "Scan completed",
            scan,
          });
        } catch (err) {
          console.error("Scan processing error:", err);
          res.status(500).json({ error: err.message });
        }
      }
    );
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message });
  }
};


// Scan History API
exports.getUserScans = async (req, res) => {
  try {
    const scans = await Scan.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.json(scans);
  } catch (error) {
    console.error("History error:", error);
    res.status(500).json({ error: error.message });
  }
};


// Dashboard Stats API
exports.dashboardStats = async (req, res) => {
  try {
    const scans = await Scan.find({ user: req.user.id });

    let total = scans.length;
    let high = 0,
      critical = 0,
      moderate = 0,
      low = 0;

    scans.forEach((scan) => {
      high += scan.severity?.high || 0;
      critical += scan.severity?.critical || 0;
      moderate += scan.severity?.moderate || 0;
      low += scan.severity?.low || 0;
    });

    res.json({
      totalScans: total,
      vulnerabilities: { high, critical, moderate, low },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: error.message });
  }
};