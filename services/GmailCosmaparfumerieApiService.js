require('dotenv').config();
const fs = require('fs');
const { google } = require('googleapis');
const path = require('path');

const TOKEN_PATH = path.join(__dirname, 'json_mock/gmail_token.json');
const client_secret = process.env.GMAIL_CLIENT_SECRET; 
const client_id = process.env.GMAIL_CLIENT_ID ;
const redirect_uris = [process.env.GMAIL_REDIRECT_URI];

const oAuth2Client = new google.auth.OAuth2(
  client_id, client_secret, redirect_uris[0]
);

// Register the listener ONCE at app startup
oAuth2Client.on('tokens', (tokens) => {
  console.log("Received new tokens:", tokens);

  // If refresh_token is returned (usually only once), save it
  if (tokens.refresh_token) {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  } else if (tokens.access_token) {
    // update only access_token while keeping existing refresh_token
    const current = JSON.parse(fs.readFileSync(TOKEN_PATH));
    const updated = { ...current, access_token: tokens.access_token };
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(updated, null, 2));
  }
});

// ---------------- get le token ----------------------- //
async function auth(){
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',   // 👈 force Google to return refresh_token
    scope: ['https://www.googleapis.com/auth/gmail.modify'],
  });
  return url;
}

async function callback(code){
  if (!code) throw new Error("Code node provided");

  try {

    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // 👉 Make sure refresh_token is present
    console.log("Tokens:", tokens);

    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    return 'Authentication successful! Token saved.';

  } catch (err) {
    console.error(err);
    throw new Error("Authentication failed");
  }
}

// ------------------------ get attachment ---------------------------- //
async function getMessageAttachments(gmail, messageId, parts) {
  const attachments = [];

  async function traverse(parts) {
    if (!parts) return;
    for (const part of parts) {
      if (part.filename && part.filename.length > 0 && part.body.attachmentId) {
        const attachRes = await gmail.users.messages.attachments.get({
          userId: 'me',
          messageId,
          id: part.body.attachmentId
        });

        // Gmail sends base64url, convert to base64
        const base64 = attachRes.data.data.replace(/-/g, '+').replace(/_/g, '/');

        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          data: `data:${part.mimeType};base64,${base64}` // 👉 ready to preview on frontend
        });
      }

      // recurse if nested
      if (part.parts) {
        await traverse(part.parts);
      }
    }
  }

  await traverse(parts);
  return attachments;
}


// ----------------------------------------------------- // 

async function authorize() {
  if (!fs.existsSync(TOKEN_PATH)) throw new Error('Token not found. Go to /auth first.');
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
  oAuth2Client.setCredentials(token);

  // // Listen for refreshed tokens
  // oAuth2Client.on('tokens', (newTokens) => {
  //   if (newTokens.refresh_token) {
  //     console.log("Token refreshed !");
  //     // Save the new refresh_token as well
  //     fs.writeFileSync(TOKEN_PATH, JSON.stringify({ ...token, ...newTokens }, null, 2));
  //   }
  // });

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

async function replyConversation(threadId, replyText, destinataire){
  try {
    const auth = await authorize();
    const gmail = google.gmail({ version: 'v1', auth });

    // 1. Récupérer toute la conversation
    const thread = await gmail.users.threads.get({
      userId: 'me',
      id: threadId
    });

    const messages = thread.data.messages;
    const lastMessage = messages[messages.length - 1]; // Dernier message du thread

    console.log(lastMessage);

    // 2. Extraire les headers utiles
    const headers = lastMessage.payload.headers;
    const msgIdHeader = lastMessage.id;
    const subject = headers.find(h => h.name === 'Subject').value;
    const to = destinataire;

    // 3. Construire la réponse
    const rawMessage = makeEmail(to, subject, replyText, msgIdHeader);

    // 4. Envoyer dans la même conversation
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawMessage,
        threadId // garder la conversation
      }
    });
    
    return { success: true, res };

  } catch (err) {
    console.error(err);
    throw new Error("Error sending reply");
  }
}

// ------------------- format data -------------------------- //

async function formatGmailResponse(data) {
  if (!data || !data.messages) return null;

  const auth = await authorize();
  const gmail = google.gmail({ version: 'v1', auth });

  const messages = await Promise.all(
    data.messages.map(async (msg) => {
      // -------- Extract body --------
      let messageBody = '';
      if (msg.payload) {
        if (msg.payload.parts && msg.payload.parts.length > 0) {
          const htmlPart = msg.payload.parts.find(p => p.mimeType === 'text/html');
          const plainPart = msg.payload.parts.find(p => p.mimeType === 'text/plain');
          const part = htmlPart || plainPart;
          if (part?.body?.data) {
            const decoded = Buffer.from(part.body.data, 'base64').toString('utf-8');
            messageBody = cleanHtml(decoded);
          }
        } else if (msg.payload.body?.data) {
          const decoded = Buffer.from(msg.payload.body.data, 'base64').toString('utf-8');
          messageBody = cleanHtml(decoded);
        }
      }

      // -------- Extract headers --------
      const headers = msg.payload?.headers || [];
      const getHeader = (name) => {
        const h = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
        return h ? h.value : '';
      };

      // -------- Fetch attachments --------
      const attachments = await getMessageAttachments(gmail, msg.id, msg.payload.parts);

      return {
        message_id: msg.id,
        from: getHeader('From'),
        to: getHeader('To'),
        subject: getHeader('Subject'),
        message: messageBody,
        date: getHeader('Date') || null,
        attachments 
      };
    })
  );

  return {
    source_app: "Gmail",
    conversation_id: data.id,
    messages
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

function makeEmail(to, subject, body, messageId) {
  const mail = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `In-Reply-To: ${messageId}`,
    `References: ${messageId}`,
    "Content-Type: text/plain; charset=\"UTF-8\"",
    "MIME-Version: 1.0",
    "",
    body
  ].join("\n");

  return Buffer.from(mail).toString("base64").replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

module.exports = { 
  getConversation,
  replyConversation,

  auth,
  callback
};