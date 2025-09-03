const { DataTypes } = require("sequelize");
const sequelize = require("../config/database.js");

const Role = sequelize.define("Role", {
  name: { type: DataTypes.STRING(100), allowNull: false },
  state: { type: DataTypes.INTEGER, allowNull: false},
}, {
  tableName: "role",
  timestamps: false
});

module.exports = Role;
