const { DataTypes } = require("sequelize");
const sequelize = require("../config/database.js");

const UserProject = sequelize.define("UserProject", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  project_id: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: "user_project",
  timestamps: false
});

module.exports = UserProject;
