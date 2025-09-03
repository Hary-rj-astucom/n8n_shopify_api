const { DataTypes } = require("sequelize");
const sequelize = require("../config/database.js");

const Label = sequelize.define("Label", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  state: { type: DataTypes.INTEGER, allowNull: false},
}, {
  tableName: "label",
  timestamps: false
});

module.exports = Label;
