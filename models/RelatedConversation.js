const { DataTypes } = require("sequelize");
const sequelize = require("../config/database.js");

const RelatedConversation = sequelize.define("RelatedConversation", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ticket_id: { type: DataTypes.INTEGER, allowNull: false },
  conversation_email_id: { type: DataTypes.TEXT, allowNull: false },
  created_at: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: "related_conversation",
  timestamps: false
});

module.exports = RelatedConversation;