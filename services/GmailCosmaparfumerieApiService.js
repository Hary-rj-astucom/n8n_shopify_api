require('dotenv').config();
const fs = require('fs');
const { google } = require('googleapis');

const TOKEN_PATH = path.join(__dirname, 'json_mock/gmail_token.json');

async function authorize() {
  const client_secret = "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"; 
  const client_id = "802601190444-if4prn8mg95sprqs0vp1pha9689mam90.apps.googleusercontent.com";
  const redirect_uris = "";

  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris
  );

  const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
  oAuth2Client.setCredentials(token);

  return oAuth2Client;
}

async function getConversation(threadId) {
  const auth = await authorize();
  const gmail = google.gmail({ version: 'v1', auth });

  // Fetch one conversation (thread)
  const res = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
  });

  const thread = res.data;
  console.log('Conversation Snippet:', thread.snippet);

  // thread.messages.forEach((msg, i) => {
  //   const headers = msg.payload.headers;
  //   const subject = headers.find(h => h.name === 'Subject')?.value;
  //   const from = headers.find(h => h.name === 'From')?.value;
  //   const date = headers.find(h => h.name === 'Date')?.value;

  //   console.log(`\nMessage ${i + 1}`);
  //   console.log(`From: ${from}`);
  //   console.log(`Subject: ${subject}`);
  //   console.log(`Date: ${date}`);
  //   console.log('Body:', getBody(msg));
  // });

  return thread.messages;

}

// Helper to extract plain text body
function getBody(message) {
  const encodedBody = getEncodedBody(message.payload);
  if (!encodedBody) return '';
  return Buffer.from(encodedBody, 'base64').toString('utf8');
}

function getEncodedBody(payload) {
  if (!payload.parts) {
    return payload.body.data;
  }
  for (const part of payload.parts) {
    if (part.mimeType === 'text/plain' && part.body.data) {
      return part.body.data;
    }
    if (part.parts) {
      const data = getEncodedBody(part);
      if (data) return data;
    }
  }
  return null;
}

module.exports = { 
  getConversation,
  getBody
};