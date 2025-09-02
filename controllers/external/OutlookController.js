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

const getReplayMessage = async (req, res) => {
  try {

    let result = await OutlookApiService.replyToMessage(req.body.message_id, req.body.replyText);
    res.status(200).send(result);

  } catch (error) {

    console.dir(error?.response);

    //console.error('Error consultation outlook:', error);
    res.status(500).send('Error consultation outlook');
  }
}

module.exports = { 
    getConversationThreads,
    getReplayMessage
};