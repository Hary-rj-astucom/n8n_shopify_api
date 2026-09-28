const { DataTypes } = require("sequelize");
const sequelize = require("../config/database.js");

const Note = sequelize.define("Note", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ticket_id: { type: DataTypes.INTEGER, allowNull: false },
  note: { type: DataTypes.JSON, allowNull: true },
  user_created: { type: DataTypes.INTEGER, allowNull: false },
  state: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: "note",
  timestamps: false
});

module.exports = Note;