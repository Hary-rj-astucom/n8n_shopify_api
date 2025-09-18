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
  return url;
}

async function callback(code){
  if (!code) throw new Error("Code node provided");

  try {

    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    return 'Authentication successful! Token saved.';

  } catch (err) {
    console.error(err);
    throw new Error("Authentication failed");
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

    return formatGmailResponse(thread.data);

  } catch (err) {
    console.error(err);
    throw new Error("Error fetching conversation");
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

    return { success: true, result };

  } catch (err) {
    console.error(err);
    throw new Error("Error sending reply");
  }
}

// ------------------- format data -------------------------- //

function formatGmailResponse(data) {
    if (!data || !data.messages) return null;

    return {
        source_app: "Gmail", 
        conversation_id: data.id,
        messages: data.messages.map(msg => {
            // Récupérer le corps principal
            let messageBody = '';
            if (msg.payload) {
                // Si multipart, prendre la première partie text/html ou text/plain
                if (msg.payload.parts && msg.payload.parts.length > 0) {
                    const htmlPart = msg.payload.parts.find(p => p.mimeType === 'text/html');
                    const plainPart = msg.payload.parts.find(p => p.mimeType === 'text/plain');
                    const part = htmlPart || plainPart;
                    if (part && part.body && part.body.data) {
                      decoded = Buffer.from(part.body.data, 'base64').toString('utf-8');
                      messageBody = cleanHtml(decoded);
                    }
                } else if (msg.payload.body && msg.payload.body.data) {
                  decoded = Buffer.from(msg.payload.body.data, 'base64').toString('utf-8');
                  messageBody = cleanHtml(decoded);
                }
            }

            // Récupérer les headers utiles
            const headers = msg.payload ? msg.payload.headers || [] : [];
            const getHeader = name => {
                const h = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
                return h ? h.value : '';
            };

            return {
                message_id: msg.id,
                from: getHeader('From'),
                to: getHeader('To'),
                subject: getHeader('Subject'),
                message: messageBody,
                date: getHeader('Date') || null
            };
        })
    };
}

function cleanHtml(html) {
    if (!html) return '';

    // Supprime le CSS dans <style>...</style>
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Remplacer les balises de paragraphe et <br> par des sauts de ligne
    let text = html.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<\/div>/gi, '\n');

    // Supprimer toutes les autres balises
    text = text.replace(/<[^>]+>/g, '');

    // Décode les entités HTML basiques
    text = text.replace(/&nbsp;/gi, ' ')
               .replace(/&amp;/gi, '&')
               .replace(/&lt;/gi, '<')
               .replace(/&gt;/gi, '>')
               .replace(/&quot;/gi, '"')
               .replace(/&apos;/gi, "'")
               .replace(/&ntilde;/gi, 'ñ');

    // Supprime les espaces et lignes vides multiples
    text = text.replace(/\n\s*\n/g, '\n\n').trim();

    return text;
}

module.exports = { 
  getConversation,
  replyConversation,

  auth,
  callback
};