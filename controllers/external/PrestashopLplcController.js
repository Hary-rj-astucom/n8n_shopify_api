const PrestashopLplcApiService = require('../../services/PrestashopLplcApiService');

const getOrderWithTransactionsByNumber = async (req, res) => {
  try {

    let result = await PrestashopLplcApiService.getOrderByReference(req.body.order_num);
    res.status(200).send(result);

  } catch (error) {
    console.log('Error consultation prestashop:', error);
    res.status(200).send('Error consultation prestashop : ' + error?.message);
  }
}

const getLastOrderWithTransactionsByEmail = async (req, res) => {
  try {

    let result = await PrestashopLplcApiService.getOrdersByEmail(req.body.email);
    res.status(200).send(result);

  } catch (error) {
    console.log('Error consultation prestashop:', error);
    res.status(200).send('Error consultation prestashop : ' + error?.message);
  }
}

const getOrderWithTransactionsByRefOrByEmail = async (req, res) => {
  try {

    let result = await PrestashopLplcApiService.getOrderByRefOrByEmail(req.body.order_num, req.body.email);
    res.status(200).send(result);

  } catch (error) {
    console.log('Error consultation prestashop:', error);
    res.status(200).send('Error consultation prestashop : ' + error?.message);
  }
}

const getInvoiceByRefOrByEmail = async (req, res) => {
  try {

    let result = await PrestashopLplcApiService.getInvoice(req.body.order_num, req.body.email);
    res.status(200).send(result);

  } catch (error) {
    console.log('Error consultation prestashop:', error);
    res.status(200).send('Error consultation prestashop : ' + error?.message);
  }
}

module.exports = { 
  getOrderWithTransactionsByNumber,
  getLastOrderWithTransactionsByEmail,
  getOrderWithTransactionsByRefOrByEmail,
  getInvoiceByRefOrByEmail,
};