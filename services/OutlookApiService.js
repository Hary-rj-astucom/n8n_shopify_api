require('dotenv').config();
const axios = require('axios');
const qs = require('qs');

async function getAccessToken() {
  const tokenUrl = `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`;
  const data = {
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
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
    `https://graph.microsoft.com/v1.0/me/messages$select=conversationId,subject,from,body,receivedDateTime,id,hasAttachments,toRecipients,ccRecipients,bccRecipients,replyTo&$filter=conversationId eq '${conversationId}'`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data.value;
}

async function replyToMessage(messageId, replyText) {
  const token = await getAccessToken();
  await axios.post(
    `${process.env.GRAPH_URL}/me/messages/${messageId}/reply`,
    { comment: replyText },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  await axios.post(
    `${process.env.GRAPH_URL}/me/messages/${messageId}/send`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

module.exports = { 
  getConversationThreads,
  replyToMessage
};