const GmailCosmaparfumerieApiService = require('../../services/GmailCosmaparfumerieApiService');

const auth = async (req, res) => {
  try {

    let url = await GmailCosmaparfumerieApiService.auth();
    res.redirect(url);

  } catch (error) {
    console.error('Error consultation gmail:', error);
    res.status(500).send('Error consultation gmail');
  }
}

const callback = async (req, res) => {
  try {

    console.log(req.path);

    const { code } = req.query;

    //generation du token etc
    const result = await GmailCosmaparfumerieApiService.callback(code);
    res.status(200).send(result); 

  } catch (error) {
    console.log('Error consultation gmail:', error);
    res.status(400).send('Error consultation gmail : ' + error.response?.data?.error_description);
  }
}

const senddraft = async (req, res) => {
  try{

    const result = await GmailCosmaparfumerieApiService.sendDraft(req.body.draftId);
    res.status(200).send(result); 

  } catch (error) {
    console.log('Error consultation gmail:', error);
    res.status(400).send('Error consultation gmail : ' + error.response?.data?.error_description);
  }
}

const getbodymessage = async (req, res) => {
  try{

    const result = await GmailCosmaparfumerieApiService.getFullBodyMessage(req.body.message_id);
    res.status(200).send(result); 

  } catch (error) {
    console.log('Error consultation gmail:', error);
    res.status(400).send('Error consultation gmail : ' + error.response?.data?.error_description);
  }
}

module.exports = { 
    auth,
    callback,
    senddraft,
    getbodymessage
};