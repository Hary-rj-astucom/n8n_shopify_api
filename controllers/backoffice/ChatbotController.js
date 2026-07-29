require('dotenv').config();

const sequelize = require("../../config/database.js");
const ConversationChat = require("../../models/ConversationChat.js");
const MessageChat = require("../../models/MessageChat.js");

const getChatMessage = async (req, res) => {
    try {

        let params = [];
        const perPage = parseInt(req.body.per_page) || 10;
        let page = Math.max(1, parseInt(req.body.page) || 1);
        let offset = (page - 1) * perPage;
        
        const conversation_chat_id = req.body.conversation_chat_id;
        const dataQuery = 'SELECT * FROM `message_chat` WHERE conversation_chat_id = ? ORDER BY id DESC LIMIT ? OFFSET ?';

        // execution du prepared statement
        const result = await sequelize.query(dataQuery, {
            replacements: [conversation_chat_id, perPage, offset],
            type: sequelize.QueryTypes.SELECT
        });
        
        return res.json({
            messages: result
        });

    } catch(err){
        console.error(err);
        throw new Error("Error getting message");
    }
}

module.exports = { getChatMessage };