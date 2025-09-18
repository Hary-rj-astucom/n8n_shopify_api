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

async function replyToMessage(messageId, conversation_id, replyText, destinataire) {
  const token = await getAccessToken();

  /* methode 1 */
  // 1. Create the reply draft
  await axios.post(
    `${process.env.OUTLOOK_COSMASHOP_GRAPH_URL}/users/${process.env.OUTLOOK_COSMASHOP_USER_APP}/messages/${messageId}/reply`,
    { 
      "comment": replyText,
      "toRecipients": [
        {
          "emailAddress": {
            "address": destinataire
          }
        }
      ]
    },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': `application/json` } }
  );

  // 2. get le broillon (`${process.env.OUTLOOK_COSMASHOP_GRAPH_URL}/users/${process.env.OUTLOOK_COSMASHOP_USER_APP}/mailFolders/Drafts/messages?$filter=conversationId eq '${conversation_id}' and startswith(subject,'Re:')&$orderby=createdDateTime desc&$top=1`)
  const response_daft = await axios.get(
    `${process.env.OUTLOOK_COSMASHOP_GRAPH_URL}/users/${process.env.OUTLOOK_COSMASHOP_USER_APP}/mailFolders/Drafts/messages?$filter=conversationId eq '${conversation_id}' and startswith(subject,'Re:')&$top=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const draft_id = response_daft.data.value[0].id;
  //console.dir(draft_id);

  // 3. remettre le recipients
  await axios.patch(
    `${process.env.OUTLOOK_COSMASHOP_GRAPH_URL}/users/${process.env.OUTLOOK_COSMASHOP_USER_APP}/messages/${draft_id}`,
    { 
      "toRecipients": [
        {
          "emailAddress": {
            "address": destinataire
          }
        }
      ]
    },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': `application/json` } }
  );

  // 4. Send the draft
  await axios.post(
    `${process.env.OUTLOOK_COSMASHOP_GRAPH_URL}/users/${process.env.OUTLOOK_COSMASHOP_USER_APP}/messages/${draft_id}/send`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );

  console.log('Reply sent successfully!');
}

// -------------------- format message --------------------------- //
function formatConversation(messages) {
    if (!Array.isArray(messages) || messages.length === 0) return null;

    return {
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
                message: content
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