const { DataTypes } = require("sequelize");
const sequelize = require("../config/database.js");

const Permission = sequelize.define("Permission", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  role: { type: DataTypes.STRING(100), allowNull: false },
  action: { type: DataTypes.STRING(20), allowNull: false },
  project_id: { type: DataTypes.INTEGER, allowNull: false },
  label_id: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false },
  state: { type: DataTypes.INTEGER, allowNull: false},
}, {
  tableName: "permission",
  timestamps: false
});

module.exports = Permission;