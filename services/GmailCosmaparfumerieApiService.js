require('dotenv').config();
const fs = require('fs');
const { google } = require('googleapis');
const path = require('path');
const sharp = require("sharp");
const heicConvert = require('heic-convert');

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
async function getMessageAttachments(gmail, messageId, parts, baseUrl = "https://dev-ia.astucom.com/n8n_cosmia") {
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

        // attachments.push({
        //   filename: part.filename,
        //   mimeType: part.mimeType,
        //   data: `data:${part.mimeType};base64,${base64}` // 👉 ready to preview on frontend
        // });

        const buffer = Buffer.from(base64, 'base64');

        // Créer le dossier /uploads s’il n’existe pas
        const uploadDir = path.join(__dirname, '../public/uploads');
        fs.mkdirSync(uploadDir, { recursive: true });

        // Enregistrer le fichier
        const filePath = path.join(uploadDir, messageId + "_" + part.filename);

        // Supprimer le fichier s’il existe déjà
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Fichier existant supprimé : ${messageId + "_" + part.filename}`);
        }

        // Écrire le nouveau fichier
        fs.writeFileSync(filePath, buffer);

        // Générer le lien public de consultation
        // const fileUrl = `${baseUrl}/public/uploads/${encodeURIComponent(messageId + "_" + part.filename)}`;

        // attachments.push({
        //   filename: part.filename,
        //   mimeType: part.mimeType,
        //   url: fileUrl,
        // });

        const result = await convertToJpgIfHeic(filePath);

        const finalPath = result.path;
        const finalFilename = path.basename(finalPath);
        const finalUrl = `${baseUrl}/public/uploads/${encodeURIComponent(finalFilename)}`;

        attachments.push({
          filename: finalFilename,
          mimeType: result.converted ? 'image/jpeg' : part.mimeType,
          url: finalUrl,
          converted: result.converted // 👈 flag exposé si tu veux
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

async function convertToJpgIfHeic(inputPath) {
  const ext = path.extname(inputPath).toLowerCase();

  // ⛔ Pas HEIC / HEIF → rien à faire
  if (ext !== '.heic' && ext !== '.heif') {
    return {
      path: inputPath,
      converted: false
    };
  }

  console.log('🟡 HEIC détecté, conversion en JPG…');

  const inputBuffer = fs.readFileSync(inputPath);

  const outputBuffer = await heicConvert({
    buffer: inputBuffer,
    format: 'JPEG',
    quality: 0.85
  });

  const outputPath = inputPath.replace(/\.(heic|heif)$/i, '.jpg');

  // Supprimer le fichier s’il existe déjà
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
    console.log(`🗑️ Fichier existant supprimé : ${path.basename(outputPath)}`);
  }

  fs.writeFileSync(outputPath, outputBuffer);

  // Optionnel : supprimer le HEIC original
  fs.unlinkSync(inputPath);

  console.log('✅ Conversion HEIC → JPG terminée');

  return {
    path: outputPath,
    converted: true
  };
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

async function replyConversation(threadId, replyText, destinataire, attachments = []){
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
    let rawMessage = "";
    
    if(attachments.length == 0){
      rawMessage = makeEmail(to, subject, replyText, msgIdHeader);
    }else{
      rawMessage = makeEmailWithMultipleAttachments(to, subject, replyText, msgIdHeader, attachments)
    } 

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

async function sendDraft(draftId) {
  try {
    const auth = await authorize();
    const gmail = google.gmail({ version: 'v1', auth });

    const res = await gmail.users.drafts.send({
      userId: 'me',
      requestBody: { id: draftId },
    });

    return { success: true, res };

  } catch (err) {
    console.error(err);
    throw new Error("Error sending reply");
  }
}

async function getFullBodyMessage(messageId) {
  try{

    const auth = await authorize();
    const gmail = google.gmail({ version: 'v1', auth });

    const res = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full", // can be "metadata", "minimal", "full", or "raw"
    });

    const msg = res.data;

    // ---- extract message body -----------

    const extractBody = (payload) => {
      if (!payload) return '';

      // Si on a des sous-parts dans payload.parts[0].parts
      let parts = payload.parts;
      if (Array.isArray(parts) && parts.length > 0 && parts[0].parts) {

        if(parts[0].parts[0].parts){
          parts = parts[0].parts[0].parts;
        }else{
          parts = parts[0].parts;
        }

      }

      if (Array.isArray(parts) && parts.length > 0) {
        const htmlPart = parts.find((p) => p.mimeType === 'text/html');
        const plainPart = parts.find((p) => p.mimeType === 'text/plain');
        const part = htmlPart || plainPart;

        if (part?.body?.data) {
          const decoded = Buffer.from(part.body.data, 'base64').toString('utf-8');
          return cleanHtml(decoded);
        }
      } else if (payload.body?.data) {
        const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8');
        return cleanHtml(decoded);
      }

      return '';
    };
    // console.log(msg.payload);

    const messageBody = extractBody(msg.payload);

    return { message : messageBody };

  } catch (err) {
    console.error(err);
    throw new Error("Error fetching conversation");
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


      // if (msg.payload) {
      //   if (msg.payload.parts && msg.payload.parts.length > 0) {
      //     const htmlPart = msg.payload.parts.find(p => p.mimeType === 'text/html');
      //     const plainPart = msg.payload.parts.find(p => p.mimeType === 'text/plain');
      //     const part = htmlPart || plainPart;
      //     if (part?.body?.data) {
      //       const decoded = Buffer.from(part.body.data, 'base64').toString('utf-8');
      //       messageBody = cleanHtml(decoded);
      //     }
      //   } else if (msg.payload.body?.data) {
      //     const decoded = Buffer.from(msg.payload.body.data, 'base64').toString('utf-8');
      //     messageBody = cleanHtml(decoded);
      //   }
      // }

      const extractBody = (payload) => {
        if (!payload) return '';

        // Si on a des sous-parts dans payload.parts[0].parts
        let parts = payload.parts;
        if (Array.isArray(parts) && parts.length > 0 && parts[0].parts) {

          if(parts[0].parts[0].parts){
            parts = parts[0].parts[0].parts;
          }else{
            parts = parts[0].parts;
          }

        }

        if (Array.isArray(parts) && parts.length > 0) {
          const htmlPart = parts.find((p) => p.mimeType === 'text/html');
          const plainPart = parts.find((p) => p.mimeType === 'text/plain');
          const part = htmlPart || plainPart;

          if (part?.body?.data) {
            const decoded = Buffer.from(part.body.data, 'base64').toString('utf-8');
            return cleanHtml(decoded);
          }
        } else if (payload.body?.data) {
          const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8');
          return cleanHtml(decoded);
        }

        return '';
      };

      messageBody = extractBody(msg.payload);

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

    // Supprimer les balises <style>...</style>
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Remplacer les balises <br>, </p> et </div> par des sauts de ligne
    let text = html.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<\/div>/gi, '\n');

    // Supprimer toutes les balises sauf <a href="...">...</a>
    text = text.replace(/<(?!\/?a\b[^>]*>)[^>]+>/gi, '');

    // Nettoyer les attributs de <a> pour ne garder que href
    text = text.replace(/<a\b([^>]*)>/gi, (match, attrs) => {
        const hrefMatch = attrs.match(/href\s*=\s*(['"])(.*?)\1/i);
        const href = hrefMatch ? hrefMatch[2] : '#';
        return `<a href="${href}">`;
    });

    // Décoder les entités HTML courantes
    text = text.replace(/&nbsp;/gi, ' ')
               .replace(/&amp;/gi, '&')
               .replace(/&lt;/gi, '<')
               .replace(/&gt;/gi, '>')
               .replace(/&quot;/gi, '"')
               .replace(/&apos;/gi, "'")
               .replace(/&ntilde;/gi, 'ñ');

    // Supprimer les espaces et lignes vides multiples
    text = text.replace(/\n\s*\n/g, '\n\n').trim();

    return text;
}

function makeEmail(to, subject, body, messageId) {
  const signature = `
  <br><br>
  <div style="font-family: Calibri, sans-serif; font-size: 11pt; color: #000;">
    <table cellspacing="0" cellpadding="0" style="border: none;">
      <tr>
        <td style="vertical-align: middle; padding-right: 12px;">
          <img src="https://www.cosma-parfumeries.com/media/logo/websites/1/LOGO_1.png"
               alt="Logo" width="140" style="border: none;">
        </td>
        <td style="vertical-align: middle;">
          <div style="line-height: 1.4;">
            <strong>cosma-parfumeries</strong><br>
            ✉️ <a href="mailto:contact@cosma-parfumeries.fr" style="color:#000; text-decoration:none;">
              contact@cosma-parfumeries.fr
            </a><br>
            🌐 <a href="https://www.cosma-parfumeries.com" style="color:#0078D4; text-decoration:none;">
              https://www.cosma-parfumeries.com
            </a>
          </div>
        </td>
      </tr>
    </table>
  </div>
  `;

  const htmlBody = `
    <div>
      ${body.replace(/\n/g, '<br>')}
      ${signature}
    </div>
  `;

  const mail = [
    `To: ${to.trim().replace(/[\r\n]+/g, '')}`,
    `Subject: ${subject.trim().replace(/[\r\n]+/g, '')}`,
    `In-Reply-To: ${messageId}`,
    `References: ${messageId}`,
    "Content-Type: text/html; charset=\"UTF-8\"",
    "MIME-Version: 1.0",
    "",
    htmlBody
  ].join("\n");

  return Buffer.from(mail).toString("base64").replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makeEmailWithMultipleAttachments(to, subject, bodyText, messageId, attachments = []) {
  const boundaryMixed = "mixed_" + Date.now();
  const boundaryAlt = "alt_" + Date.now();

  const signatureHtml = `
  <div style="font-family: Calibri, sans-serif; font-size: 11pt; color: #000;">
    <table cellspacing="0" cellpadding="0" style="border: none;">
      <tr>
        <td style="vertical-align: middle; padding-right: 12px;">
          <img src="https://www.cosma-parfumeries.com/media/logo/websites/1/LOGO_1.png"
               alt="Logo" width="140" style="border:none;">
        </td>
        <td style="vertical-align: middle; line-height:1.4;">
          <strong>cosma-parfumeries</strong><br>
          ✉️ <a href="mailto:contact@cosma-parfumeries.fr"
               style="color:#000; text-decoration:none;">
            contact@cosma-parfumeries.fr
          </a><br>
          🌐 <a href="https://www.cosma-parfumeries.com"
               style="color:#0078D4; text-decoration:none;">
            https://www.cosma-parfumeries.com
          </a>
        </td>
      </tr>
    </table>
  </div>
  `;

  const bodyHtml = `
    <div>
      ${bodyText.replace(/\n/g, "<br>")}
      <br><br>
      ${signatureHtml}
    </div>
  `;

  const mailParts = [
    `To: ${to.trim().replace(/[\r\n]+/g, "")}`,
    `Subject: ${subject.trim().replace(/[\r\n]+/g, "")}`,
    `In-Reply-To: ${messageId}`,
    `References: ${messageId}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundaryMixed}"`,
    "",
    `--${boundaryMixed}`,
    `Content-Type: multipart/alternative; boundary="${boundaryAlt}"`,
    "",

    // TEXT
    `--${boundaryAlt}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    bodyText,
    "",

    // HTML
    `--${boundaryAlt}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    bodyHtml,
    "",

    `--${boundaryAlt}--`,
    ""
  ];

  // Pièces jointes
  attachments.forEach(att => {
    mailParts.push(
      `--${boundaryMixed}`,
      `Content-Type: ${att.mimeType || "application/octet-stream"}; name="${att.filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${att.filename}"`,
      "",
      att.contentBase64.replace(/\r?\n/g, ""),
      ""
    );
  });

  mailParts.push(`--${boundaryMixed}--`);

  return Buffer.from(mailParts.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ------------------------ send mail 2 -------------------------- //

function makeEmail2(to, subject, body, messageId, cc = []) {
  const clean = str => str.trim().replace(/[\r\n]+/g, '');

  const signatureHtml = `
    <br><br>
    <div style="font-family: Calibri, sans-serif; font-size: 11pt; color: #000;">
      <table cellspacing="0" cellpadding="0" style="border: none;">
        <tr>
          <td style="vertical-align: middle; padding-right: 12px;">
            <img src="https://www.cosma-parfumeries.com/media/logo/websites/1/LOGO_1.png"
                alt="Logo" width="140" style="border: none;">
          </td>
          <td style="vertical-align: middle;">
            <div style="line-height: 1.4;">
              <strong>cosma-parfumeries</strong><br>
              ✉️ <a href="mailto:contact@cosma-parfumeries.fr" style="color:#000; text-decoration:none;">
                contact@cosma-parfumeries.fr
              </a><br>
              🌐 <a href="https://www.cosma-parfumeries.com" style="color:#0078D4; text-decoration:none;">
                https://www.cosma-parfumeries.com
              </a>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;

  const htmlBody = `
    <div>
      ${body.replace(/\n/g, "<br>")}
      <br><br>
      ${signatureHtml}
    </div>
  `;

  const headers = [
    `To: ${clean(to)}`,
    cc.length ? `Cc: ${cc.map(clean).join(", ")}` : null,
    `Subject: ${clean(subject)}`,
    `In-Reply-To: ${messageId}`,
    `References: ${messageId}`,
    'Content-Type: text/html; charset="UTF-8"',
    "MIME-Version: 1.0",
    "",
    htmlBody
  ].filter(Boolean);

  return Buffer.from(headers.join("\n"))
    .toString("base64")
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeEmailWithMultipleAttachments2(to, subject, bodyText, messageId, attachments = [], cc = []) {

  const boundaryMixed = "mixed_" + Math.random().toString(36).slice(2);
  const boundaryAlt = "alt_" + Math.random().toString(36).slice(2);

  const signatureHtml = `
  <div style="font-family: Calibri, sans-serif; font-size: 11pt; color: #000;">
    <table cellspacing="0" cellpadding="0" style="border: none;">
      <tr>
        <td style="vertical-align: middle; padding-right: 12px;">
          <img src="https://www.cosma-parfumeries.com/media/logo/websites/1/LOGO_1.png"
               alt="Logo" width="140" style="border:none;">
        </td>
        <td style="vertical-align: middle; line-height:1.4;">
          <strong>cosma-parfumeries</strong><br>
          ✉️ <a href="mailto:contact@cosma-parfumeries.fr"
               style="color:#000; text-decoration:none;">
            contact@cosma-parfumeries.fr
          </a><br>
          🌐 <a href="https://www.cosma-parfumeries.com"
               style="color:#0078D4; text-decoration:none;">
            https://www.cosma-parfumeries.com
          </a>
        </td>
      </tr>
    </table>
  </div>`;

  const bodyHtml = `<div>${bodyText.replace(/\n/g, "<br>")}<br><br>${signatureHtml}</div>`;

  const clean = str => str.trim().replace(/[\r\n]+/g, '');

  // --- HEADERS ---
  const headerLines = [
    `To: ${clean(to)}`,
    cc.length ? `Cc: ${cc.map(clean).join(", ")}` : null,
    `Subject: ${clean(subject)}`,
    `In-Reply-To: ${messageId}`,
    `References: ${messageId}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundaryMixed}"`,
  ].filter(Boolean);

  // --- BODY PART (multipart/alternative) ---
  const altPart = [
    `--${boundaryMixed}`,
    `Content-Type: multipart/alternative; boundary="${boundaryAlt}"`,
    ``,
    `--${boundaryAlt}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    bodyText,
    ``,
    `--${boundaryAlt}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    bodyHtml,
    ``,
    `--${boundaryAlt}--`,
  ];

  // --- ATTACHMENTS ---
  const attachmentParts = [];
  attachments.forEach(att => {
    // Nettoyer le base64 : enlever espaces/sauts de ligne éventuels
    const cleanBase64 = att.contentBase64.replace(/\s+/g, '');

    // Découper en lignes de 76 caractères (RFC 2045)
    const chunked = cleanBase64.match(/.{1,76}/g).join("\r\n");

    attachmentParts.push(
      `--${boundaryMixed}`,
      `Content-Type: ${att.mimeType || "application/octet-stream"}; name="${att.filename}"`,
      `Content-Transfer-Encoding: base64`,
      `Content-Disposition: attachment; filename="${att.filename}"`,
      ``,
      chunked,
      ``
    );
  });

  // --- ASSEMBLAGE FINAL ---
  const allParts = [
    ...headerLines,
    ``,                          // ligne vide séparant headers du body
    ...altPart,
    ...attachmentParts,
    `--${boundaryMixed}--`
  ];

  const raw = allParts.join("\r\n");

  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function replyConversation2(threadId, replyText, attachments = [], options = {}) {
  try {
    const { to, cc = [], subjectOverride = null } = options;

    const auth = await authorize();
    const gmail = google.gmail({ version: 'v1', auth });

    // 1. Get thread
    const thread = await gmail.users.threads.get({
      userId: 'me',
      id: threadId
    });

    const messages = thread.data.messages;
    const lastMessage = messages[messages.length - 1];

    const headers = lastMessage.payload.headers;

    const originalSubject = headers.find(h => h.name === 'Subject')?.value || "";
    const messageIdHeader = headers.find(h => h.name === 'Message-ID')?.value;

    // ✅ Subject modifié ou fallback
    const subject = subjectOverride || `Re: ${originalSubject}`;

    // ⚠️ TO obligatoire
    if (!to) {
      throw new Error("TO is required");
    }

    let rawMessage = "";

    if (attachments.length === 0) {
      rawMessage = makeEmail2(to, subject, replyText, messageIdHeader, cc);
    } else {
      rawMessage = makeEmailWithMultipleAttachments2(to, subject, replyText, messageIdHeader, attachments, cc);
    }

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawMessage,
        threadId
      }
    });

    return { success: true, res };

  } catch (err) {
    console.error(err);
    throw new Error("Error sending reply");
  }
}

async function getAllMessage(threadId, ticket_id){
  let conversations = [];

  // get the first thread
  conversations.push(await getConversation(threadId));

  // get all related conversation
  const dataQuery = `
    SELECT id, ticket_id, conversation_email_id FROM related_conversation WHERE ticket_id = ?
  `;
  const result = await sequelize.query(dataQuery, {
    replacements: [ticket_id],
    type: sequelize.QueryTypes.SELECT
  });

  for (const element of result) {
    const data = await getConversation(element.conversation_email_id);
    conversations.push(data);
  }

  const result_final = {
    source_app: conversations[0]?.source_app || null,
    conversation_id: conversations[0]?.conversation_id || null,
    messages: await conversations.reduce((acc, conv) => {
      if (Array.isArray(conv.messages)) {
        acc.push(...conv.messages);
      }
      return acc;
    }, [])
  };

  await result_final.messages.sort((a, b) => new Date(a.date) - new Date(b.date));

  return result_final;
}

module.exports = { 
  getConversation,
  replyConversation,
  replyConversation2,

  auth,
  callback,
  sendDraft,
  getFullBodyMessage,

  getAllMessage
};