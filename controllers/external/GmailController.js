const GmailCosmaparfumerieApiService = require('../../services/GmailCosmaparfumerieApiService');

const auth = async (req, res) => {
  try {

    let result = await GmailCosmaparfumerieApiService.auth();
    res.status(200).send(result);

  } catch (error) {
    console.error('Error consultation gmail:', error?.response);
    res.status(500).send('Error consultation gmail');
  }
}

const callback = async (req, res) => {
  try {
    const { code } = req.query;

    //generation du token etc
    const result = await GmailCosmaparfumerieApiService.callback(code);
    res.status(200).send(result); 

  } catch (error) {
    console.log('Error consultation gmail:', error);
    res.status(400).send('Error consultation gmail : ' + error.response?.data?.error_description);
  }
}


module.exports = { 
    auth,
    callback
};