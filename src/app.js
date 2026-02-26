const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes");
const scanRoutes = require("./routes/scanRoutes");
const githubRoutes = require("./routes/githubRoutes");
const webhookRoutes = require("./routes/webhookRoutes"); 

const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/scan", scanRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/webhook", webhookRoutes); 

// Temporary protected test route
const { protect } = require("./middleware/authMiddleware");

app.get("/api/protected", protect, (req, res) => {
  res.json({
    message: "Secure route accessed",
    user: req.user,
  });
});

app.get("/", (req, res) => {
  res.send("SecurePipeline API running...");
});

module.exports = app;