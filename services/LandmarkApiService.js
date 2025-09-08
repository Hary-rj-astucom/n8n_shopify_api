require('dotenv').config();
const axios = require("axios");
const xml2js = require("xml2js");
const {isObject} = require("../utils/tools");

class LandmarkTracking {

  status = [
    ["50", "Shipment Data Uploaded"],
    ["60", "Shipment inventory allocated"],
    ["75", "Shipment Processed"],
    ["80", "Shipment Fulfilled"],
    ["90", "Shipment held for payment"],
    ["100", "Shipment information transmitted to carrier"],
    ["125", "Customs Cleared"],
    ["135", "Customs Issue"],
    ["150", "Crossing Border"],
    ["155", "Crossing Received"],
    ["200", "Item scanned at postal facility"],
    ["225", "Item grouped at Landmark or partner facility"],
    ["250", "Item scanned for crossing"],
    ["275", "Item in transit with carrier"],
    ["300", "Item out for delivery"],
    ["400", "Attempted delivery"],
    ["410", "Item available for pickup"],
    ["450", "Item re-directed to new address"],
    ["500", "Item successfully delivered"],
    ["510", "Proof Of Delivery"],
    ["550", "Return received at handling facility"],
    ["570", "Return Received"],
    ["800", "Claim Issued"],
    ["900", "Delivery failed"]
  ];

  constructor(testMode = true) {
    this.username = process.env.LANDMARK_USERNAME;
    this.password = process.env.LANDMARK_PWD;
    this.clientId = process.env.LANDMARK_CLIENTID;
    this.testMode = testMode;
    this.endpoint = process.env.LANDMARK_ENDPOINT;
  }

  getStatus(code) {
    const found = this.status.find(([c]) => c === code);
    return found ? found[1] : "Unknown status";
  }

  // construit le XML pour une requête de tracking
  buildRequestXML(trackingNumber, retrievalType = "Historical") {
    const builder = new xml2js.Builder({ headless: true });
    const xmlObj = {
      TrackRequest: {
        Login: {
          Username: this.username,
          Password: this.password,
        },
        Test: this.testMode.toString(),
        ClientID: this.clientId,
        TrackingNumber: trackingNumber,
        RetrievalType: retrievalType,
      },
    };
    return builder.buildObject(xmlObj);
  }

  // envoie la requête
  async track(trackingNumber) {
    try {
      const xml = this.buildRequestXML(trackingNumber);

      const response = await axios.post(this.endpoint, `RQXML=${encodeURIComponent(xml)}`, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      // parser la réponse XML
      const parsed = await xml2js.parseStringPromise(response.data, { explicitArray: false });
      let result =  parsed.TrackResponse || parsed;

      if(result.Errors){
        throw new Error(result.Errors.Error.ErrorMessage);
      }

      if((isObject(result.Result.Packages.Package))){
        //one package
        result.Result.Packages.Package.Events.Event.EventStatus = this.getStatus(result.Result.Packages.Package.Events.Event.EventCode);
      }else{
        //multiple package
        (result.Result.Packages.Package).forEach(element => {
          element.Events.Event.EventStatus = this.getStatus(element.Events.Event.EventCode);
        });
      }
      
      return result;

    } catch (error) {
      throw error;
    }
  }
}

module.exports = LandmarkTracking;