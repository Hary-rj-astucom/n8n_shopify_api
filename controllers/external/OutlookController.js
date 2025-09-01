const OutlookApiService = require('../../services/OutlookApiService');

const getConversationThreads = async (req, res) => {
  try {

    let result = await OutlookApiService.getConversationThreads(req.body.conversation_id);
    res.status(200).send(result);

  } catch (error) {
    console.error('Error consultation outlook:', error);
    res.status(500).send('Error consultation outlook');
  }
}

module.exports = { 
    getConversationThreads
};