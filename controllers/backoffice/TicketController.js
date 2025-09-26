const sequelize = require("../../config/database.js");
const OutlookApiService = require('../../services/OutlookApiService');

const OutlookCosmashopApiService = require('../../services/OutlookCosmashopApiService');
const OutlookDigiparfApiService = require('../../services/OutlookDigiparfApiService');
const GmailCosmaparfumerieApiService = require('../../services/GmailCosmaparfumerieApiService');

const Ticket = require("../../models/Ticket.js");
const User = require("../../models/User.js");
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
        project.name as project_name,
        need_attention
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
      SELECT ticket.id,
        ticket.num_ticket,
        ticket.subject_ticket,
        ticket.conversation_email_id,
        ticket.to_do,
        ticket.original_client_mail,
        ticket.reception_mail,
        ticket.nom_client,
        ticket.num_commande,
        ticket.label_id,
        ticket.project_id,
        ticket.created_at,
        ticket.status,
        ticket.need_attention,
        ticket.state, 
        label.name as label_name, 
        project.name as project_name 
      FROM ticket 
      JOIN label ON label.id = ticket.label_id 
      JOIN project ON project.id = ticket.project_id
      WHERE ticket.id = ?
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
        result_conv = await GmailCosmaparfumerieApiService.getConversation(result[0].conversation_email_id);
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

    const ticket_id = req.body.ticket_id;
    const messageId = req.body.first_message_id;
    const replyText = req.body.replyText;

    //get ticket and needed information
    const dataQuery = `
      SELECT ticket.id, ticket.num_ticket, ticket.subject_ticket, ticket.conversation_email_id, ticket.original_client_mail,
        ticket.reception_mail, ticket.nom_client, ticket.num_commande, ticket.label_id, ticket.project_id, ticket.created_at,
        ticket.status, ticket.need_attention, ticket.state, label.name as label_name, project.name as project_name 
      FROM ticket 
      JOIN label ON label.id = ticket.label_id 
      JOIN project ON project.id = ticket.project_id
      WHERE ticket.id = ?
    `;
    const result = await sequelize.query(dataQuery, {
      replacements: [ticket_id],
      type: sequelize.QueryTypes.SELECT
    });
    const project_id = result[0].project_id;
    const destinataire = result[0].original_client_mail;
    const conversation_id = result[0].conversation_email_id;

    let attachements = [];
    if(req.body.attachements){
      attachements = req.body.attachements;
    }

    switch (project_id) {
      case 1:
        // COSMASHOP
        console.log("envoie messagerie COSMASHOP");
        result_conv = await OutlookCosmashopApiService.replyToMessage(messageId, replyText, attachements);
        break;
      case 2:
        // COSMA-PARFUMERIE
        console.log("envoie messagerie COSMA-PARFUMERIE");
        result_conv = await GmailCosmaparfumerieApiService.replyConversation(conversation_id, replyText, destinataire, attachements);
        break;
      case 3:
        // DIGIPARF
        console.log("envoie messagerie DIGIPARF");
        result_conv = await OutlookDigiparfApiService.replyToMessage(messageId, replyText, attachements);
        break;
      default:
        result_conv = [];
    }

    const user = await User.findByPk(req.user.id);
    await TicketHistoricalComment.create({ comment: "[ACTION] " + user.name + " a repondu(e) au client", ticket_id: ticket_id, user_id: req.user.id });

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
    if(updated){
      const user = await User.findByPk(req.user.id);
      await TicketHistoricalComment.create({ comment: "[ACTION] Ticket mis a jour par " + user.name, ticket_id: req.params.id, user_id: req.user.id + ( (req.body.status) ? "[ "+ req.body.status +" ]" : "" ) });
      res.json({ message: "Ticket updated" })
    }else{
      res.status(404).json({ error: "Ticket not found" });
    }
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
    const count = await Ticket.count({
      where: { conversation_email_id: req.body.conversation_id }
    });

    if (count > 0) {
      const [updated] = await Ticket.update(
        { need_attention: 1 },
        { where: { conversation_email_id: req.body.conversation_id } }
      );

      res.json({ found: 1, updated });
    } else {
      res.json({ found: 0 });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

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
