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

const changePassword = async (req, res) => {
  try {

    const { recent_password, new_password, confirm_new_password } = req.body;
    
    // find the user
    const user = await User.findOne({ where: { id : req.user.id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Validate password
    const isMatch = await bcrypt.compare(recent_password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    // verification du nouveau mot de passe
    if(new_password != confirm_new_password) return res.status(401).json({ error: "Please confirm your new password" });

    // sauvegarde du nouveau mot de passe
    const [updated] = await User.update({ password : await bcrypt.hash(new_password, 10) }, { where: { id: user.id } });

    res.status(201).json({ message: "Password changed successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { 
  login, 
  changePassword 
};
