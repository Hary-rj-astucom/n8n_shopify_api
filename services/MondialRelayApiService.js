require('dotenv').config();
const axios = require('axios');
const { parseStringPromise } = require("xml2js");

async function tracingColisDetaille(expedition) {

  // Construction du corps XML SOAP
  const xml = `<?xml version="1.0" encoding="ISO-8859-1"?>
  <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
    <soap12:Body>
      <WSI2_TracingColisDetaille xmlns="${process.env.MONDIAL_RELAY_URL}">
        <Enseigne>${process.env.MONDIAL_RELAY_BRAND_ID}</Enseigne>
        <Expedition>${expedition}</Expedition>
        <Langue>FR</Langue>
        <Security>${process.env.MONDIAL_RELAY_SECURITY}</Security>
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

    if(jsonResult['soap:Envelope']['soap:Body']['WSI2_TracingColisDetailleResponse']['WSI2_TracingColisDetailleResult']['STAT'] == '97'){

      // Construction du corps XML SOAP
      const xml = `<?xml version="1.0" encoding="ISO-8859-1"?>
      <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
        <soap12:Body>
          <WSI2_TracingColisDetaille xmlns="${process.env.MONDIAL_RELAY_URL}">
            <Enseigne>${process.env.MONDIAL_RELAY_BRAND_ID}</Enseigne>
            <Expedition>${expedition}</Expedition>
            <Langue>FR</Langue>
            <Security>${process.env.MONDIAL_RELAY_SECURITY_2}</Security>
          </WSI2_TracingColisDetaille>
        </soap12:Body>
      </soap12:Envelope>`;

      const response2 = await axios.post(process.env.MONDIAL_RELAY_URL_SERVICE, xml, {
        headers: {
          "Content-Type": "application/soap+xml; charset=utf-8",
        },
      });

      // Transformer XML en JSON
      jsonResult = await parseStringPromise(response2.data, { explicitArray: false });
    }

    return JSON.stringify(jsonResult, null, 2);

  } catch (error) {
    console.error("Erreur lors de l'appel Mondial Relay:", error.message);
    throw error;
  }
}

module.exports = { 
  tracingColisDetaille
};