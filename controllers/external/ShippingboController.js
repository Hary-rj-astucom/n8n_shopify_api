require('dotenv').config();
const ShippingboApiService = require('../../services/ShippingboApiService');

const showOrder = async (req, res) => {
  try {
    const shippingbo = new ShippingboApiService();

    // Génère l’URL d’authentification (va dans le navigateur)
    console.log("👉 Connecte-toi ici :", shippingbo.getAuthUrl());

    // Exemple : chercher une commande par référence
    const order = await shippingbo.getOrderByReference(req.body.suivi_num);
    console.log("Commande :", order);

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
    await shippingbo.callback(code);

  } catch (error) {
    console.log('Error consultation shippingbo:', error);
    res.status(400).send('Error consultation shippingbo : ' + error.response?.data?.error_description);
  }
}

module.exports = { 
  showOrder,
  callback
};