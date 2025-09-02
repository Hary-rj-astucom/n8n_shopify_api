require('dotenv').config();
const axios = require('axios');
const qs = require('qs');

async function getAccessToken() {
  const tokenUrl = `https://login.microsoftonline.com/${process.env.OUTLOOK_TENANT_ID}/oauth2/v2.0/token`;
  const data = {
    client_id: process.env.OUTLOOK_CLIENT_ID,
    client_secret: process.env.OUTLOOK_CLIENT_SECRET,
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
    `${process.env.OUTLOOK_GRAPH_URL}/users/${process.env.OUTLOOK_USER_APP}/messages?$filter=conversationId eq '${conversationId}'&$top=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data.value.sort((a, b) => new Date(a.receivedDateTime) - new Date(b.receivedDateTime));
}

async function replyToMessage(messageId, replyText) {
  const token = await getAccessToken();
  // 1. Create the reply draft
  await axios.post(
    `${process.env.OUTLOOK_GRAPH_URL}/users/${process.env.OUTLOOK_USER_APP}/messages/${messageId}/reply`,
    { comment: replyText },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  // 2. Send the draft
  await axios.post(
    `${process.env.OUTLOOK_GRAPH_URL}/users/${process.env.OUTLOOK_USER_APP}/messages/${messageId}/send`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );

  console.log('Reply sent successfully!');
}

module.exports = { 
  getConversationThreads,
  replyToMessage
};