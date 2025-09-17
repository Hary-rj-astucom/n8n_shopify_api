const sequelize = require("../../config/database.js");
const OutlookApiService = require('../../services/OutlookApiService');

const OutlookCosmashopApiService = require('../../services/OutlookCosmashopApiService');
const OutlookCosmaparfumerieApiService = require('../../services/OutlookCosmaparfumerieApiService');
const OutlookDigiparfApiService = require('../../services/OutlookDigiparfApiService');

const Ticket = require("../../models/Ticket.js");
const TicketHistoricalComment = require("../../models/TicketHistoricalComment.js");
const Project = require("../../models/Project.js");

const getTickets = async (req, res) => {
  try {
    const perPage = parseInt(req.query.per_page) || 10;
    let page = Math.max(1, parseInt(req.query.page) || 1);
    let offset = (page - 1) * perPage;

    let subQuery = '';
    let paramsTotal = [];
    let params = [];

    // 🔍 Global search
    if (req.query.search) {
      const search = `%${req.query.search}%`;
      subQuery += ` AND (
        num_ticket LIKE ? OR 
        subject_ticket LIKE ? OR 
        original_client_mail LIKE ? OR 
        nom_client LIKE ? OR 
        num_commande LIKE ? OR 
        label_id LIKE ? OR 
        project_id LIKE ? OR 
        status LIKE ? OR 
      )`;

      paramsTotal.push(search, search, search, search, search, search, search, search);
      params.push(search, search, search, search, search, search, search, search);
    }

    // 🔍 Multi-criteria filters
    const multiFields = [
      "num_ticket",
      "subject_ticket",
      "original_client_mail",
      "nom_client",
      "num_commande",
      "label_id",
      "project_id",
      "status"
    ];

    for (const field of multiFields) {
      const key = field.replace('.', '_'); // ex: magasin.name → magasin_name
      if (req.query[key]) {
        const likeValue = `%${req.query[key]}%`;
        subQuery += ` AND ${field} LIKE ?`;
        paramsTotal.push(likeValue);
        params.push(likeValue);
      }
    }

    // 🧮 Total count
    const totalQuery = `
      SELECT COUNT(*) as nb 
      FROM ticket 
      WHERE 1=1 ${subQuery}
    `;
    const [resultTotal] = await sequelize.query(totalQuery, {
      replacements: paramsTotal,
      type: sequelize.QueryTypes.SELECT
    });

    const total = resultTotal.nb || 0;
    const nbPage = Math.ceil(total / perPage);

    // Reset page if too big
    if (page > nbPage) {
      page = 1;
      offset = 0;
    }

    // 📄 Paginated data
    const dataQuery = `
      SELECT 
        ticket.id,
        num_ticket,
        subject_ticket,
        original_client_mail, 
        nom_client,
        num_commande, 
        label_id,
        project_id,
        status,
        label.name as label,
        project.name as project_name
      FROM ticket
      JOIN label ON label.id = ticket.label_id 
      JOIN project ON project.id = ticket.project_id
      WHERE ticket.state=1 ${subQuery} ORDER BY ticket.id ASC
      LIMIT ? OFFSET ? 
    `;
    params.push(perPage, offset);

    const result = await sequelize.query(dataQuery, {
      replacements: params,
      type: sequelize.QueryTypes.SELECT
    });

    return res.json({
      total_item: total,
      per_page: perPage,
      total_page: nbPage,
      current_page: page,
      data: result
    });

  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
};

const getTicketsDetails = async (req, res) => {
  try{

    let params = [];
    params.push(req.params.id);

    // get detail ticket
    const dataQuery = `
      SELECT *
      FROM ticket
      WHERE id = ?
    `;
    const result = await sequelize.query(dataQuery, {
      replacements: params,
      type: sequelize.QueryTypes.SELECT
    });

    // get comment 
    const dataQueryComment = `
      SELECT *
      FROM ticket_historical_comment
      WHERE ticket_id = ? ORDER BY id DESC
    `;
    const result_comment = await sequelize.query(dataQueryComment, {
      replacements: params,
      type: sequelize.QueryTypes.SELECT
    });
    
    // get mail conversation
    const project_id = result[0].project_id;
    let result_conv;

    switch (project_id) {
      case 1:
        // COSMASHOP
        console.log("consultation messagerie COSMASHOP");
        result_conv = await OutlookCosmashopApiService.getConversationThreads(result[0].conversation_email_id);
        break;
      case 2:
        // COSMA-PARFUMERIE
         console.log("consultation messagerie COSMA-PARFUMERIE");
        result_conv = await OutlookCosmaparfumerieApiService.getConversationThreads(result[0].conversation_email_id);
        break;
      case 3:
        // DIGIPARF
         console.log("consultation messagerie DIGIPARF");
        result_conv = await OutlookDigiparfApiService.getConversationThreads(result[0].conversation_email_id);
        break;
      default:
        result_conv = [];
    }

    return res.json({
      details: result,
      comment: result_comment,
      conversation: result_conv
    });

  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
}

const respondMail = async (req, res) => {
  try{

    const project_id = req.body.project_id;
    const messageId = req.body.message_id;
    const conversation_id = req.body.conversation_id;
    const replyText = req.body.replyText;
    const destinataire = req.body.destinataire;

    switch (project_id) {
      case 1:
        // COSMASHOP
        console.log("envoie messagerie COSMASHOP");
        result_conv = await OutlookCosmashopApiService.replyToMessage(messageId, conversation_id, replyText, destinataire);
        break;
      case 2:
        // COSMA-PARFUMERIE
        console.log("envoie messagerie COSMA-PARFUMERIE");
        result_conv = await OutlookCosmaparfumerieApiService.replyToMessage(messageId, conversation_id, replyText, destinataire);
        break;
      case 3:
        // DIGIPARF
        console.log("envoie messagerie DIGIPARF");
        result_conv = await OutlookDigiparfApiService.replyToMessage(messageId, conversation_id, replyText, destinataire);
        break;
      default:
        result_conv = [];
    }

    return res.json({message: "message envoye"});

  } catch (error) {
    console.error(error?.response?.data);
    return res.status(200).json(error?.response?.data);

    //return res.status(400).json({ error: error.message });
  }
}

const createTicket = async (req, res) => {
  try {
    const project = await Project.findByPk(req.body.project_id);
    const lastId = await Ticket.max('id');
    req.body.num_ticket = project.code + "-" + (lastId + 1);
    const ticket = await Ticket.create(req.body);
    res.status(201).json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const updateTicketDetails = async (req, res) => {
  try {
    const [updated] = await Ticket.update(req.body, { where: { id: req.params.id } });
    updated ? res.json({ message: "Ticket updated" }) : res.status(404).json({ error: "Ticket not found" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

const deleteTicket = async (req, res) => {
  try {
    const [updated] = await Ticket.update({ state: 2 }, { where: { id: req.params.id } });
    updated ? res.json({ message: "Ticket deleted" }) : res.status(404).json({ error: "Ticket deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

const addTicketComment = async (req, res) => {
  try {
    const ticketcomment = await TicketHistoricalComment.create(req.body);
    res.status(201).json(ticketcomment);
  } catch(err){
    res.status(400).json({ error: err.message });
  }
}

// verify ticket a mark attention by conversationId
const getTicketsbyConvId = async (req, res) => {
  try {
    const tickets = await Ticket.findAll({ where: { conversation_email_id: req.body.conversation_id } });
    if(tickets.length > 0){
      const [updated] = await Ticket.update({ need_attention: 1 }, { where: { conversation_email_id: req.body.conversation_id } });
      res.json(1)
    }else{
      res.json(0);
    }
  } catch (err) {
    console.dir(err);
    res.status(500).json({ error: err.message });
  }  
}

module.exports = {
  getTickets,
  getTicketsDetails,
  updateTicketDetails,
  deleteTicket,
  createTicket,
  respondMail,
  addTicketComment,
  getTicketsbyConvId
};
