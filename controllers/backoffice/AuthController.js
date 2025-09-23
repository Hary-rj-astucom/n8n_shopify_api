const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../../models/User.js");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check user existence
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });

    // 2. Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    // 3. Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({ message: "Login successful", token, name: user.name, email: user.email, role: user.role });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { login };
