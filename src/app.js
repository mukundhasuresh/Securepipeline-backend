const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes");
const scanRoutes = require("./routes/scanRoutes");

const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173", // frontend URL
    credentials: true, // IMPORTANT for cookies
  })
);

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/scan", scanRoutes);

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