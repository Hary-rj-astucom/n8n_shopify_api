require('dotenv').config();
const axios = require('axios');
const { parseStringPromise } = require("xml2js");
const crypto = require('crypto');

async function tracingColisDetaille(expedition) {

  //calcule de la cle
  let privateKey = process.env.MONDIAL_RELAY_SECRET_KEY_API;
  let paramsObj = {
    Enseigne: process.env.MONDIAL_RELAY_BRAND_ID,
    Expeditions: expedition,
    Langue: 'FR'
  };
  let security = await createSecurityKey(privateKey, paramsObj);

  // Construction du corps XML SOAP
  const xml = `<?xml version="1.0" encoding="ISO-8859-1"?>
  <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
    <soap12:Body>
      <WSI2_TracingColisDetaille xmlns="${process.env.MONDIAL_RELAY_URL}">
        <Enseigne>${process.env.MONDIAL_RELAY_BRAND_ID}</Enseigne>
        <Expedition>${expedition}</Expedition>
        <Langue>FR</Langue>
        <Security>${security}</Security>
      </WSI2_TracingColisDetaille>
    </soap12:Body>
  </soap12:Envelope>`;

  try {

    const response = await axios.post(process.env.MONDIAL_RELAY_URL_SERVICE, xml, {
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8",
      },
    });

    // Transformer XML en JSON
    let jsonResult = await parseStringPromise(response.data, { explicitArray: false });
    return JSON.stringify(jsonResult, null, 2);

  } catch (error) {
    console.error("Erreur lors de l'appel Mondial Relay:", error.message);
    throw error;
  }
}

/**
 * Crée la clé de sécurité (Security) selon la méthode décrite.
 *
 * @param {string[]} paramsOrder - Tableau de noms de paramètres dans l'ordre imposé par le doc.
 * @param {Object} paramsObj - Objet clé->valeur contenant les paramètres (peut contenir undefined/null/'').
 * @param {string} privateKey - La clé privée (ex: "TestAPI1key").
 * @param {Object} [options] - Options (facultatif)
 * @param {boolean} [options.skipEmpty=true] - Si true, on IGNORE les paramètres undefined/null/'' (comportement par défaut).
 * @param {boolean} [options.trim=true] - Si true, on applique trim() à chaque valeur string avant concaténation.
 * @returns {string} - Chaîne MD5 en MAJUSCULE (32 caractères).
 */
function createSecurityKey(privateKey, paramsObj, paramsOrder = ['Enseigne', 'Expeditions', 'Langue'], options) {
  options = Object.assign({ skipEmpty: true, trim: true }, options || {});

  if (!Array.isArray(paramsOrder)) {
    throw new TypeError('paramsOrder doit être un tableau de noms de paramètres (ordre imposé).');
  }
  if (typeof paramsObj !== 'object' || paramsObj === null) {
    throw new TypeError('paramsObj doit être un objet.');
  }
  if (typeof privateKey !== 'string') {
    privateKey = String(privateKey == null ? '' : privateKey);
  }

  const parts = [];
  for (const name of paramsOrder) {
    // Récupère la valeur
    let val = paramsObj[name];

    // Normalisation de la valeur
    if (val === undefined || val === null) {
      if (options.skipEmpty) continue;
      val = '';
    } else {
      val = String(val);
      if (options.trim) val = val.trim();
      if (val.length === 0 && options.skipEmpty) continue;
    }

    parts.push(val);
  }

  // Concaténation finale + clé privée (sans séparateur)
  const concatenated = parts.join('') + privateKey;

  console.log(concatenated);

  // MD5 et majuscules
  const md5 = crypto.createHash('md5').update(concatenated, 'utf8').digest('hex').toUpperCase();

  console.log(md5);

  return md5;
}

module.exports = { 
  tracingColisDetaille
};