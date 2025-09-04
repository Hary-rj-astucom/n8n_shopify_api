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
  return response.data.value.sort((a, b) => new Date(a.receivedDateTime) - new Date(b.receivedDateTime));
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

async function testPolicy(){
  const token = await getAccessToken();
  await axios.post(
    `https://graph.microsoft.com/v1.0/users/mphrygien@astucom.com/sendMail`,
    { 
      "message": {
        "subject": "Test",
        "body": {
          "contentType": "Text",
          "content": "Ceci est un test"
        },
        "toRecipients": [
          {
            "emailAddress": {
              "address": "hrajaonah@astucom.com"
            }
          }
        ]
      },
      "saveToSentItems": "true" 
    },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': `application/json` } }
  );
}

module.exports = { 
  getConversationThreads,
  replyToMessage,
  testPolicy
};