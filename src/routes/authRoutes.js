const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const { register, login, logout } = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

// Temporary browser login route (testing only)
router.get("/test-login", async (req, res) => {
  try {
    const user = await User.findOne({ email: "test@gmail.com" });

    if (!user) {
      return res.status(404).json({ message: "Test user not found" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "none",
    });

    res.send("Logged in via browser");
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;