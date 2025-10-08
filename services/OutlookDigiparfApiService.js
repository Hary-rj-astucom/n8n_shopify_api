require('dotenv').config();
const axios = require('axios');
const qs = require('qs');
const path = require('path');

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
        data: fileUrl 
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
        content: replyText
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

    // Supprime CSS <style>...</style>
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Remplace certaines balises par des sauts de ligne
    html = html.replace(/<br\s*\/?>/gi, '\n');
    html = html.replace(/<\/p>/gi, '\n');
    html = html.replace(/<\/div>/gi, '\n');
    html = html.replace(/<\/h[1-6]>/gi, '\n');

    // Supprime toutes les autres balises
    html = html.replace(/<[^>]+>/g, '');

    // Décodage des entités HTML
    html = html.replace(/&nbsp;/gi, ' ')
               .replace(/&amp;/gi, '&')
               .replace(/&lt;/gi, '<')
               .replace(/&gt;/gi, '>')
               .replace(/&quot;/gi, '"')
               .replace(/&apos;/gi, "'");

    // Normalisation des espaces et retours à la ligne
    html = html.replace(/\r/g, '');
    html = html.replace(/\n\s*\n/g, '\n\n').trim();

    return html;
}


module.exports = { 
  getConversationThreads,
  replyToMessage
};