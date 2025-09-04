const { DataTypes } = require("sequelize");
const sequelize = require("../config/database.js");

const TicketHistoricalComment = sequelize.define("TicketHistoricalComment", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  comment: { type: DataTypes.TEXT, allowNull: false },
  ticket_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  created_at: { type: DataTypes.DATE, allowNull: false },
  state: { type: DataTypes.INTEGER, allowNull: false},
}, {
  tableName: "ticket_historical_comment",
  timestamps: false
});

module.exports = TicketHistoricalComment;