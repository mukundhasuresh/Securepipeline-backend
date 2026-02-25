const unzipper = require("unzipper");
const fs = require("fs-extra");
const { exec } = require("child_process");
const path = require("path");
const Scan = require("../models/Scan");


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
      `cd "${extractPath}" && npm audit --json`,
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
            audit = JSON.parse(stdout);
          } catch (parseError) {
            console.error("JSON parse error:", parseError);
            return res.status(500).json({
              error: "Invalid audit output",
            });
          }

          const vulnerabilities =
            audit.vulnerabilities ||
            audit.metadata?.vulnerabilities ||
            {};

          const scan = await Scan.create({
            user: req.user.id,
            vulnerabilities,
            severity: audit.metadata?.vulnerabilities || {},
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