require('dotenv').config();
const ShippingboApiService = require('../../services/ShippingboApiService');
const PrestashopApiService = require('../../services/PrestashopApiService');
const MagentoApiService = require('../../services/MagentoApiService');

const showOrder = async (req, res) => {
  try {
    const shippingbo = new ShippingboApiService();
    let order = await shippingbo.getOrderById(req.body.order_id);
    // retourne si il y a des donnees
    res.status(200).send(order);

  } catch (error) {
    console.log('Error consultation shippingbo:', error);
    res.status(200).send(error);
  }
}

const showOrderByOriginRef = async (req, res) => {
  try {
    try {
      console.log(`consultation shippingbo`);
      const shippingbo = new ShippingboApiService();
      // Exemple : chercher une commande par référence
      let order = await shippingbo.getOrderByReference(req.body.origin_ref);
      if(Array.isArray(order)){
        // tableau vide
        throw new Error(`non data in shippingbo`);
      }
      // retourne si il y a des donnees (donnees shippingbo)
      res.status(200).send(order);
    } catch(err) {
      try {
        console.log(`consultation magento`);
        order = await MagentoApiService.getOrderWithTransactionsByNumber(req.body.origin_ref);

        // retourne si il y a des donnees (donnees magento)
        res.status(200).send(order);
      } catch(err) {
        try {
          console.log(`consultation prestashop`);
          order = await PrestashopApiService.getOrderByReference(req.body.origin_ref);
          // retourne si il y a des donnees (donnees prestashop)
          res.status(200).send(order);
        } catch(err){
          console.log(`aucune data trouver`);
          throw new Error(`non data in all e-commerce app`);
        }
      } 
    }
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
