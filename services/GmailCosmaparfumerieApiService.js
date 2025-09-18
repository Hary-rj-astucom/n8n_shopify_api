require('dotenv').config();
const fs = require('fs');
const { google } = require('googleapis');
const path = require('path');

const TOKEN_PATH = path.join(__dirname, 'json_mock/gmail_token.json');
const client_secret = "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"; 
const client_id = "802601190444-if4prn8mg95sprqs0vp1pha9689mam90.apps.googleusercontent.com";
const redirect_uris = ["https://dev-ia.astucom.com/n8n_cosmia/gmail/callback"];

const oAuth2Client = new google.auth.OAuth2(
  client_id, client_secret, redirect_uris[0]
);

// ---------------- get le token ----------------------- //
async function auth(){
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.modify'],
  });
  res.redirect(url);
}

async function callback(code){
  if (!code) return res.status(400).send('No code provided');

  try {

    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    res.send('Authentication successful! Token saved.');

  } catch (err) {
    console.error(err);
    res.status(500).send('Authentication failed');
  }
}

// ----------------------------------------------------- // 

async function authorize() {
  if (!fs.existsSync(TOKEN_PATH)) throw new Error('Token not found. Go to /auth first.');
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

async function getConversation(threadId) {
  try {
    const auth = await authorize();
    const gmail = google.gmail({ version: 'v1', auth });

    const thread = await gmail.users.threads.get(
      { 
        userId: 'me',
        id: threadId 
      }
    );

    res.json(thread.data);

  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching conversation');
  }
}

async function replyConversation(threadId, message){
  try {
    const auth = authorize();
    const gmail = google.gmail({ version: 'v1', auth });

    // Get thread to find last message recipient
    const thread = await gmail.users.threads.get({ userId: 'me', id: threadId });
    const lastMsg = thread.data.messages[thread.data.messages.length - 1];
    const headers = lastMsg.payload.headers;
    const to = headers.find(h => h.name === 'From').value;

    // Create raw email
    const emailLines = [
      `From: me`,
      `To: ${to}`,
      `Subject: Re: ${headers.find(h => h.name === 'Subject').value}`,
      `In-Reply-To: ${lastMsg.id}`,
      `References: ${lastMsg.id}`,
      '',
      message
    ];
    const email = emailLines.join('\n');

    const encodedMessage = base64url(email);

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
        threadId: threadId
      }
    });

    res.json({ success: true, result });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error sending reply');
  }
}

module.exports = { 
  getConversation,
  replyConversation,

  auth,
  callback
};