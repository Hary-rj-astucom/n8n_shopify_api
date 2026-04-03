require('dotenv').config();
const axios = require('axios');
const qs = require('qs');
const path = require('path');
const fs = require('fs');
const sequelize = require("../config/database");

const OpenAiApiService = require('../services/OpenAiApiService');
const RelatedConversation = require("../models/RelatedConversation");

async function getAccessToken() {
  const tokenUrl = `https://login.microsoftonline.com/${process.env.OUTLOOK_DIGIPARF_TENANT_ID}/oauth2/v2.0/token`;
  const data = {
    client_id: process.env.OUTLOOK_DIGIPARF_CLIENT_ID,
    client_secret: process.env.OUTLOOK_DIGIPARF_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  };

  const response = await axios.post(tokenUrl, qs.stringify(data), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return response.data.access_token;
}

// ----------------- get attachments ----------------------------- //

async function getMessageAttachments(token, messageId, baseUrl = "https://dev-ia.astucom.com/n8n_cosmia") {
  //const token = await getAccessToken();

  const response = await axios.get(
    `${process.env.OUTLOOK_DIGIPARF_GRAPH_URL}/users/${process.env.OUTLOOK_DIGIPARF_USER_APP}/messages/${messageId}/attachments`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data.value.map(att => {
    if (att['@odata.type'] === "#microsoft.graph.fileAttachment") {

      // return {
      //   //id: att.id,
      //   filename: att.name,
      //   mimeType: att.contentType,
      //   size: att.size,
      //   data: `data:${att.contentType};base64,${att.contentBytes}` // base64 string you can use directly
      // };

      const buffer = Buffer.from(att.contentBytes, 'base64');
      
      // Créer le dossier /uploads s’il n’existe pas
      const uploadDir = path.join(__dirname, '../public/uploads');
      fs.mkdirSync(uploadDir, { recursive: true });

      // Enregistrer le fichier
      const filePath = path.join(uploadDir, messageId + "_" + att.name);

      // Supprimer le fichier s’il existe déjà
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Fichier existant supprimé : ${att.name}`);
      }

      // Écrire le nouveau fichier
      fs.writeFileSync(filePath, buffer);

      // Générer le lien public de consultation
      const fileUrl = `${baseUrl}/public/uploads/${encodeURIComponent(messageId + "_" + att.name)}`;

      return {
        //id: att.id,
        filename: att.name,
        mimeType: att.contentType,
        size: att.size,
        url: fileUrl 
      };
      
    }
    if (att['@odata.type'] === "#microsoft.graph.itemAttachment") {
      return {
        //id: att.id,
        filename: att.name,
        mimeType: "itemAttachment"
      };
    }
    return { filename: att.name, mimeType: "unknown" };
  });
}

// --------------------------------------------------------------- //

async function getConversationThreads(conversationId) {
  const token = await getAccessToken();
   const response = await axios.get(
    `${process.env.OUTLOOK_DIGIPARF_GRAPH_URL}/users/${process.env.OUTLOOK_DIGIPARF_USER_APP}/messages?$filter=conversationId eq '${conversationId}'&$top=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return formatConversation( token, response.data.value.sort((a, b) => new Date(a.receivedDateTime) - new Date(b.receivedDateTime)) );
}

async function replyToMessage(messageId, replyText, attachments = []) {
  const token = await getAccessToken();

  //text to HTML
  const openai = new OpenAiApiService();
  const replyTextHtml = await openai.formatTextToHtml(replyText);

  // 1. Create draft reply
  const draftResponse = await axios.post(
    `${process.env.OUTLOOK_DIGIPARF_GRAPH_URL}/users/${process.env.OUTLOOK_DIGIPARF_USER_APP}/messages/${messageId}/createReply`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const draftId = draftResponse.data.id;

  // 2. Update body
  await axios.patch(
    `${process.env.OUTLOOK_DIGIPARF_GRAPH_URL}/users/${process.env.OUTLOOK_DIGIPARF_USER_APP}/messages/${draftId}`,
    {
      body: {
        contentType: "HTML",
        content: replyTextHtml
      }
    },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );

  // 3. Add attachments if any
  for (const att of attachments) {
    await axios.post(
      `${process.env.OUTLOOK_DIGIPARF_GRAPH_URL}/users/${process.env.OUTLOOK_DIGIPARF_USER_APP}/messages/${draftId}/attachments`,
      {
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: att.filename,
        contentType: att.mimeType || "application/octet-stream",
        contentBytes: att.contentBase64.replace(/^data:.*;base64,/, "") // remove data URI prefix
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
  }

  // 4. Send the draft
  await axios.post(
    `${process.env.OUTLOOK_DIGIPARF_GRAPH_URL}/users/${process.env.OUTLOOK_DIGIPARF_USER_APP}/messages/${draftId}/send`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );

  console.log("Reply with attachments sent successfully!");
}

// --------------------------------------------------------------- //

/**
 * Reply to a message with correct saving + sending behavior.
 */
async function replyToMessage2(messageId, replyText, attachments = [], options = {}, ticket_id) {
  const { toRecipients = [], ccRecipients = [], subject = null } = options;

  const token = await getAccessToken();
  const openai = new OpenAiApiService();
  const replyTextHtml = await openai.formatTextToHtml(replyText);

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  //
  // 1. Create reply draft
  //
  const draftResponse = await axios.post(
    `${process.env.OUTLOOK_DIGIPARF_GRAPH_URL}/users/${process.env.OUTLOOK_DIGIPARF_USER_APP}/messages/${messageId}/createReply`,
    {},
    { headers }
  );

  const draftId = draftResponse.data.id;
  const internetMessageId = draftResponse.data.internetMessageId;
  const draftConversationId = draftResponse.data.conversationId;

  //
  // 2. Update body + recipients + subject
  //
  const updatePayload = {
    body: { contentType: "HTML", content: replyTextHtml }
  };

  if (toRecipients.length > 0) {
    updatePayload.toRecipients = toRecipients.map(email => ({
      emailAddress: { address: email }
    }));
  }

  if (ccRecipients.length > 0) {
    updatePayload.ccRecipients = ccRecipients.map(email => ({
      emailAddress: { address: email }
    }));
  }

  if (subject) updatePayload.subject = subject;

  await axios.patch(
    `${process.env.OUTLOOK_DIGIPARF_GRAPH_URL}/users/${process.env.OUTLOOK_DIGIPARF_USER_APP}/messages/${draftId}`,
    updatePayload,
    { headers }
  );

  //
  // 3. Add attachments (if any)
  //
  for (const att of attachments) {
    await axios.post(
      `${process.env.OUTLOOK_DIGIPARF_GRAPH_URL}/users/${process.env.OUTLOOK_DIGIPARF_USER_APP}/messages/${draftId}/attachments`,
      {
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: att.filename,
        contentType: att.mimeType || "application/octet-stream",
        contentBytes: att.contentBase64.replace(/^data:.*;base64,/, "")
      },
      { headers }
    );
  }

  //
  // ✅ 4. FORCE DRAFT TO BE SAVED BEFORE SENDING
  //
  await waitUntilMessageExists(process.env.OUTLOOK_DIGIPARF_USER_APP, draftId, token);

  //
  // 5. Send it
  //
  await axios.post(
    `${process.env.OUTLOOK_DIGIPARF_GRAPH_URL}/users/${process.env.OUTLOOK_DIGIPARF_USER_APP}/messages/${draftId}/send`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );

  await new Promise(res => setTimeout(res, 1000));

  const sentMessage = await getSentMessageByInternetMessageId(internetMessageId);

  const newConversationId = sentMessage?.conversationId; // ✅ The real post-send conversationId
  console.log("Old conversation ID:", draftConversationId);
  console.log("New conversation ID:", newConversationId);

  await RelatedConversation.create({ 
    ticket_id: ticket_id,
    conversation_email_id: newConversationId, 
  });

  console.log("Reply with attachments sent successfully and stored!");
}

/**
 * ✅ Ensures the draft exists in the mailbox before sending
 * Prevents the “message not found in any folder” bug.
 */
async function waitUntilMessageExists(user, messageId, token) {
  const headers = { Authorization: `Bearer ${token}` };

  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      let res = await axios.get(
        `${process.env.OUTLOOK_DIGIPARF_GRAPH_URL}/users/${user}/messages/${encodeURIComponent(messageId)}`,
        { headers }
      );
      console.log("email draft safe : ", res.data);
      return; // ✅ Exists, safe to send
    } catch (e) {
      await new Promise(res => res(200)); // Wait 200ms and retry
    }
  }

  console.warn("Warning: draft was never confirmed saved, sending anyway.");
}

async function getSentMessageByInternetMessageId(internetMessageId) {
  const token = await getAccessToken();

  const response = await axios.get(
    `${process.env.OUTLOOK_DIGIPARF_GRAPH_URL}/users/${process.env.OUTLOOK_DIGIPARF_USER_APP}/messages`,
    {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        $filter: `internetMessageId eq '${internetMessageId}'`,
        $top: 1
      }
    }
  );

  return response.data.value[0] ?? null;
}

// --------------------------------------------------------------- //

/**
 * get the conversation and conversation related 
 * In outlook, the conversation Id change when we send the mail
*/
async function getAllMessage(first_conversation_id, ticket_id){
  let conversations = [];

  // get the first thread
  conversations.push(await getConversationThreads(first_conversation_id));

  // get all related conversation
  const dataQuery = `
    SELECT id, ticket_id, conversation_email_id FROM related_conversation WHERE ticket_id = ?
  `;
  const result = await sequelize.query(dataQuery, {
    replacements: [ticket_id],
    type: sequelize.QueryTypes.SELECT
  });

  for (const element of result) {
    const data = await getConversationThreads(element.conversation_email_id);
    conversations.push(data);
  }

  return conversations;

}

// --------------------------------------------------------------- //

async function getMessageDetailByMessageId(messageId) {

  const user = process.env.OUTLOOK_DIGIPARF_USER_APP
  const token = await getAccessToken();

  const headers = { Authorization: `Bearer ${token}` };

  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      let res = await axios.get(
        `${process.env.OUTLOOK_DIGIPARF_GRAPH_URL}/users/${user}/messages/${encodeURIComponent(messageId)}`,
        { headers }
      );
      console.log("email safe : ", res);
      return res.data; // ✅ Exists, safe to send
    } catch (e) {
      await new Promise(res => res(200)); // Wait 200ms and retry
    }
  }
  return null;
}

// -------------------- format message --------------------------- //

async function formatConversation(token, messages) {
  if (!Array.isArray(messages) || messages.length === 0) return null;

  const formattedMessages = [];
  for (const msg of messages) {
    let content = msg.body && msg.body.content ? msg.body.content : '';
    if (msg.body && msg.body.contentType === 'html') {
      content = cleanHtml(content);
    }

    // Fetch attachments for this message
    const attachments = await getMessageAttachments(token, msg.id);

    formattedMessages.push({
      message_id: msg.id,
      from: msg.from?.emailAddress
        ? `${msg.from.emailAddress.name || ''} <${msg.from.emailAddress.address}>`.trim()
        : '',
      to: (msg.toRecipients || [])
        .map(r => `${r.emailAddress.name || ''} <${r.emailAddress.address}>`.trim())
        .join(', '),
      subject: msg.subject || '',
      message: content,
      date: msg.receivedDateTime || msg.sentDateTime || null,
      attachments // <= added here
    });
  }

  return {
    source_app: "Outlook",
    conversation_id: messages[0].conversationId,
    messages: formattedMessages
  };
}

function cleanHtml(html) {
    if (!html) return '';

    // Supprimer les balises <style>...</style>
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Remplacer les balises <br>, </p> et </div> par des sauts de ligne
    let text = html.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<\/div>/gi, '\n');

    // Supprimer toutes les balises sauf <a href="...">...</a>
    text = text.replace(/<(?!\/?a\b[^>]*>)[^>]+>/gi, '');

    // Nettoyer les attributs de <a> pour ne garder que href
    text = text.replace(/<a\b([^>]*)>/gi, (match, attrs) => {
        const hrefMatch = attrs.match(/href\s*=\s*(['"])(.*?)\1/i);
        const href = hrefMatch ? hrefMatch[2] : '#';
        return `<a href="${href}">`;
    });

    // Décoder les entités HTML courantes
    text = text.replace(/&nbsp;/gi, ' ')
               .replace(/&amp;/gi, '&')
               .replace(/&lt;/gi, '<')
               .replace(/&gt;/gi, '>')
               .replace(/&quot;/gi, '"')
               .replace(/&apos;/gi, "'")
               .replace(/&ntilde;/gi, 'ñ');

    // Supprimer les espaces et lignes vides multiples
    text = text.replace(/\n\s*\n/g, '\n\n').trim();

    return text;
}

module.exports = { 
  getConversationThreads,
  replyToMessage,
  replyToMessage2,
  getMessageDetailByMessageId,
  getAllMessage
};