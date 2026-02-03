const MagentoApiService = require('../../services/MagentoApiService');

const getOrderWithTransactionsByNumber = async (req, res) => {
  try {

    let result = await MagentoApiService.getOrderWithTransactionsByNumber(req.body.order_num);
    res.status(200).send(result);

  } catch (error) {
    console.log('Error consultation magento:', error);
    res.status(200).send('Error consultation magento : ' + error.response?.data?.message);
  }
}

const getOrderWithInvoiceByNumber = async (req, res) => {
  try {

    let result = await MagentoApiService.getOrderWithInvoiceByNumber(req.body.order_num);
    res.status(200).send(result);

  } catch (error) {
    console.log('Error consultation magento:', error);
    res.status(200).send('Error consultation magento : ' + error.response?.data?.message);
  }
}

module.exports = { 
  getOrderWithTransactionsByNumber,
  getOrderWithInvoiceByNumber
};