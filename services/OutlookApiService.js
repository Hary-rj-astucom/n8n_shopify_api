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
    `${process.env.OUTLOOK_GRAPH_URL}/users/${process.env.OUTLOOK_USER_APP}/messages?$filter=conversationId eq '${conversationId}'&$top=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data.value.sort((a, b) => new Date(a.receivedDateTime) - new Date(b.receivedDateTime));
}

async function replyToMessage(messageId, replyText, destinataire, original_subject, conversation_id) {
  const token = await getAccessToken();

  /* methode 1 */
  // 1. Create the reply draft
  await axios.post(
    `${process.env.OUTLOOK_GRAPH_URL}/users/${process.env.OUTLOOK_USER_APP}/messages/${messageId}/reply`,
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

  // 2. get le broillon
  const response_daft = await axios.get(
    `${process.env.OUTLOOK_GRAPH_URL}/users/${process.env.OUTLOOK_USER_APP}/mailFolders/Drafts/messages?$orderby=createdDateTime desc&$top=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const draft_id = response_daft.data.value[0].id;
  //console.dir(draft_id);

  // 3. remettre le recipients
  await axios.patch(
    `${process.env.OUTLOOK_GRAPH_URL}/users/${process.env.OUTLOOK_USER_APP}/messages/${draft_id}`,
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
    `${process.env.OUTLOOK_GRAPH_URL}/users/${process.env.OUTLOOK_USER_APP}/messages/${draft_id}/send`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );

  /* methode 2  (le mail n'apparait pas dans la conversation) */
  // let result = await axios.post(
  //   `${process.env.OUTLOOK_GRAPH_URL}/users/${process.env.OUTLOOK_USER_APP}/sendMail`,
  //   {
  //     "message": {
  //       "subject": `Re: ${original_subject}`,
  //       "body": {
  //         "contentType": "Text",
  //         "content": `${replyText}`
  //       },
  //       "toRecipients": [
  //         { "emailAddress": { "address": "destinataire" } }
  //       ],
  //       "conversationId": conversation_id
  //     },
  //     "saveToSentItems": true
  //   },
  //   { headers: { Authorization: `Bearer ${token}`, 'Content-Type': `application/json` } }
  // );

  // console.dir(result);

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