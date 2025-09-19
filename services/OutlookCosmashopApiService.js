require('dotenv').config();
const axios = require('axios');
const qs = require('qs');

async function getAccessToken() {
  const tokenUrl = `https://login.microsoftonline.com/${process.env.OUTLOOK_COSMASHOP_TENANT_ID}/oauth2/v2.0/token`;
  const data = {
    client_id: process.env.OUTLOOK_COSMASHOP_CLIENT_ID,
    client_secret: process.env.OUTLOOK_COSMASHOP_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  };

  const response = await axios.post(tokenUrl, qs.stringify(data), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return response.data.access_token;
}

async function getConversationThreads(conversationId) {
  const token = await getAccessToken();
   const response = await axios.get(
    `${process.env.OUTLOOK_COSMASHOP_GRAPH_URL}/users/${process.env.OUTLOOK_COSMASHOP_USER_APP}/messages?$filter=conversationId eq '${conversationId}'&$top=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return formatConversation( response.data.value.sort((a, b) => new Date(a.receivedDateTime) - new Date(b.receivedDateTime)) );
}

// async function replyToMessage(messageId, replyText) {
//   const token = await getAccessToken();

//   // 1. Créer la réponse en brouillon
//   const draftResponse = await axios.post(
//     `${process.env.OUTLOOK_COSMASHOP_GRAPH_URL}/users/${process.env.OUTLOOK_COSMASHOP_USER_APP}/messages/${messageId}/createReply`,
//     {}, // pas besoin de recipients ici, l’API copie ceux du mail d’origine
//     { headers: { Authorization: `Bearer ${token}` } }
//   );

//   const draft_id = draftResponse.data.id;

//   // 2. Mettre à jour le contenu du mail
//   await axios.patch(
//     `${process.env.OUTLOOK_COSMASHOP_GRAPH_URL}/users/${process.env.OUTLOOK_COSMASHOP_USER_APP}/messages/${draft_id}`,
//     {
//       body: {
//         contentType: "HTML",
//         content: replyText
//       }
//     },
//     { headers: { Authorization: `Bearer ${token}`, 'Content-Type': `application/json` } }
//   );

//   // 3. Envoyer
//   await axios.post(
//     `${process.env.OUTLOOK_COSMASHOP_GRAPH_URL}/users/${process.env.OUTLOOK_COSMASHOP_USER_APP}/messages/${draft_id}/send`,
//     {},
//     { headers: { Authorization: `Bearer ${token}` } }
//   );

//   console.log("Reply sent successfully!");
// }

async function replyToMessage(originalMessageId, replyText, destinataire) {
  const token = await getAccessToken();

  // 1. Récupérer le message original
  const original = await axios.get(
    `${process.env.OUTLOOK_COSMASHOP_GRAPH_URL}/users/${process.env.OUTLOOK_COSMASHOP_USER_APP}/messages/${originalMessageId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  // 2. Construire le mail "reply" en gardant le conversationId et les headers
  const mail = {
    subject: original.data.subject.startsWith("Re:") ? original.data.subject : "Re: " + original.data.subject,
    body: {
      contentType: "HTML",
      content: replyText
    },
    toRecipients: [
      { emailAddress: { address: destinataire } }
    ],
    conversationId: original.data.conversationId,
    internetMessageHeaders: [
      {
        name: "In-Reply-To",
        value: original.data.internetMessageId
      },
      {
        name: "References",
        value: original.data.internetMessageId
      }
    ]
  };

  // 3. Envoyer le mail
  await axios.post(
    `${process.env.OUTLOOK_COSMASHOP_GRAPH_URL}/users/${process.env.OUTLOOK_COSMASHOP_USER_APP}/sendMail`,
    { message: mail, saveToSentItems: true },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );

  console.log("Reply sent successfully with conversationId!");
}

// -------------------- format message --------------------------- //
function formatConversation(messages) {
    if (!Array.isArray(messages) || messages.length === 0) return null;

    return {
        source_app: "Outlook",
        conversation_id: messages[0].conversationId, // ou autre logique
        messages: messages.map(msg => {
            let content = msg.body && msg.body.content ? msg.body.content : '';
            if (msg.body && msg.body.contentType === 'html') {
                content = cleanHtml(content);
            }

            return {
                message_id: msg.id,
                from: msg.from?.emailAddress
                    ? `${msg.from.emailAddress.name || ''} <${msg.from.emailAddress.address}>`.trim()
                    : '',
                to: (msg.toRecipients || [])
                    .map(r => `${r.emailAddress.name || ''} <${r.emailAddress.address}>`.trim())
                    .join(', '),
                subject: msg.subject || '',
                message: content,
                date: msg.receivedDateTime || msg.sentDateTime || null
            };
        })
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