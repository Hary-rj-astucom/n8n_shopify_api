require('dotenv').config();
const soap = require("soap");

class TntApiService {
  constructor(wsdlUrl = "http://www.tnt.fr/service/?wsdl") {
    this.username = process.env.TNT_USER_NAME;
    this.password = process.env.TNT_PASSWORD;
    this.wsdlUrl = wsdlUrl;
    this.client = null;
  }

  async init() {
    if (this.client) return this.client;

    this.client = await soap.createClientAsync(this.wsdlUrl, {
      wsdl_headers: {
        "User-Agent": "NodeJS/Soap",
        Accept: "application/xml",
      },
    });

    // 🔑 Création manuelle du header WS-Security (équivalent PHP)
    const securityHeader = `
      <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
        <wsse:UsernameToken>
          <wsse:Username>${this.username}</wsse:Username>
          <wsse:Password>${this.password}</wsse:Password>
        </wsse:UsernameToken>
      </wsse:Security>
    `;

    this.client.addSoapHeader(securityHeader);

    return this.client;
  }

  async tracking(parcelNumber) {
    await this.init();
    try {
      const [result] = await this.client.trackingByConsignmentAsync({
        parcelNumber: parcelNumber,
      });

      if (!result || !result.Parcel) {
        return { error: "Colis inexistant" };
      }

      return result.Parcel;
    } catch (err) {
      return { error: err.message };
    }
  }
}

module.exports = TntApiService;


