require('dotenv').config();
import { getTracking } from '@frontboi/mondial-relay/node';

async function getShipmentStatus(trackingNumber) {
  try {

    console.log('Tracking info:', "nan");
  } catch (error) {
    console.error('Error tracking parcel:', error);
  }
}

module.exports = { getShipmentStatus };