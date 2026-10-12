const PrestashopDigiparfApiService = require('../../services/PrestashopDigiparfApiService');

const getOrderWithTransactionsByRefOrByEmail = async (req, res) => {
  try {

    let result = await PrestashopDigiparfApiService.getOrderByRefOrByEmail(req.body.order_num, req.body.email);
    res.status(200).send(result);

  } catch (error) {
    console.log('Error consultation prestashop:', error);
    res.status(200).send('Error consultation prestashop : ' + error?.message);
  }
}

const getInvoiceByRefOrByEmail = async (req, res) => {
  try {

    let result = await PrestashopDigiparfApiService.getInvoice(req.body.order_num, req.body.email);
    res.status(200).send(result);

  } catch (error) {
    console.log('Error consultation prestashop:', error);
    res.status(200).send('Error consultation prestashop : ' + error?.message);
  }
}

module.exports = { 
  getOrderWithTransactionsByRefOrByEmail,
  getInvoiceByRefOrByEmail,
};