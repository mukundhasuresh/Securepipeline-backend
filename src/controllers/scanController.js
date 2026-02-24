const unzipper = require("unzipper");
const fs = require("fs-extra");
const { exec } = require("child_process");
const path = require("path");
const Scan = require("../models/Scan");

exports.uploadAndScan = async (req, res) => {
  try {
    const zipPath = req.file.path;
    const extractPath = `uploads/${Date.now()}`;

    await fs.mkdir(extractPath);

    // Extract ZIP
    await fs
      .createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: extractPath }))
      .promise();

    // Run npm audit
    exec(
      `cd ${extractPath} && npm install && npm audit --json`,
      async (error, stdout) => {
        if (error && !stdout) {
          return res.status(500).json({ error: "Scan failed" });
        }

        const audit = JSON.parse(stdout);

        const vulnerabilities =
          audit.vulnerabilities || audit.metadata?.vulnerabilities || {};

        const scan = await Scan.create({
          user: req.user.id,
          vulnerabilities,
          severity: audit.metadata?.vulnerabilities || {},
        });

        res.json({
          message: "Scan completed",
          scan,
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};