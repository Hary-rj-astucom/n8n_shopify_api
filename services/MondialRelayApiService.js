require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const soap = require('soap');

const WSDL_URL = 'https://api.mondialrelay.com/web_services.asmx?WSDL';

async function trackParcel(trackingNumber) {

  const enseigne = process.env.MONDIAL_RELAY_BRAND_ID; 
  const secretKey = process.env.MONDIAL_RELAY_SECRET_KEY_API;
  const lang = 'FR';

  // const enseigne = "BDTEST13";
  // const secretKey = "PrivateK";
  // trackingNumber = "12345678";

  const security = crypto
    .createHash('md5')
    .update(enseigne + trackingNumber + lang + secretKey)
    .digest('hex')
    .toUpperCase();

  const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
  <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
      <WSI2_TracingColisDetaille xmlns="http://www.mondialrelay.fr/webservice/">
        <Enseigne>${enseigne}</Enseigne>
        <NumColis>${trackingNumber}</NumColis>
        <Langue>${lang}</Langue>
        <Security>${security}</Security>
      </WSI2_TracingColisDetaille>
    </soap:Body>
  </soap:Envelope>`;

  try {
    const response = await axios.post(
      'https://api.mondialrelay.com/web_services.asmx',
      xmlBody,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction':
            'http://www.mondialrelay.fr/webservice/WSI2_TracingColisDetaille',
          'User-Agent': 'Mozilla/5.0',
        },
      }
    );

    console.log(response.data);
  } catch (error) {
    console.error('Erreur tracking:', error.response?.data || error.message);
  }
}

module.exports = { 
  trackParcel
};