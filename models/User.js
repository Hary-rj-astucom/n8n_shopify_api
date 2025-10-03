const { DataTypes } = require("sequelize");
const sequelize = require("../config/database.js");

const User = sequelize.define("User", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: true, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: true },
  role: { type: DataTypes.STRING(50), defaultValue: "user" }
}, {
  tableName: "user",
  timestamps: false
});

module.exports = User;
