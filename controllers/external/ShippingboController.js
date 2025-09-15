require('dotenv').config();
const ShippingboApiService = require('../../services/ShippingboApiService');

const showOrder = async (req, res) => {
  try {
    const shippingbo = new ShippingboApiService();

    // Génère l’URL d’authentification (va dans le navigateur)
    // console.log("👉 Connecte-toi ici :", shippingbo.getAuthUrl());
    
    const order = await shippingbo.getOrderById(req.body.order_id);

    res.status(200).send(order);

  } catch (error) {
    console.log('Error consultation shippingbo:', error);
    res.status(200).send(error);
  }
}

const showOrderByOriginRef = async (req, res) => {
  try {
    const shippingbo = new ShippingboApiService();

    // Exemple : chercher une commande par référence
    const order = await shippingbo.getOrderByReference(req.body.origin_ref);

    res.status(200).send(order);

  } catch (error) {
    console.log('Error consultation shippingbo:', error);
    res.status(200).send(error);
  }
}

const callback = async (req, res) => {
  try {

    const shippingbo = new ShippingboApiService();

    const { code } = req.query;

    //generation du token etc
    const result = await shippingbo.callback(code);
    res.status(200).send(result); 

  } catch (error) {
    console.log('Error consultation shippingbo:', error);
    res.status(400).send('Error consultation shippingbo : ' + error.response?.data?.error_description);
  }
}

module.exports = { 
  showOrder,
  showOrderByOriginRef,
  callback
};