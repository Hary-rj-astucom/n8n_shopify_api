require('dotenv').config();
const OpenAiApiService = require('../../services/OpenAiApiService');

const translate = async (req, res) => {
  try {
    const openai = new OpenAiApiService();

    const { text, target } = req.body;

    const translated = await openai.translate(text, {
      target,          // 👈 cible passée dynamiquement
      formality: 'courtois',
      domain: 'ecommerce',
      //glossary: { Checkout: 'Paiement' },
    });

    res.status(200).send({ translated_text: translated });

  } catch (error) {
    console.error('Error consultation shopify:', error);
    res.status(500).send('Error consultation shopify');
  }
}

module.exports = { 
  translate
};