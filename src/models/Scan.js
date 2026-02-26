const mongoose = require("mongoose");

const scanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    vulnerabilities: [],
    severity: {
      low: Number,
      moderate: Number,
      high: Number,
      critical: Number,
    },

    // New fields
    securityScore: Number,
    riskLevel: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Scan", scanSchema);