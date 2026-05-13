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
    console.error('Error consultation:', error);
    res.status(500).send('Error consultation');
  }
}

const correctText = async (req, res) => {
  try {
    const openai = new OpenAiApiService();

    const { text } = req.body;

    const correctText = await openai.textCorrection(text, {
      formality: 'courtois',
      domain: 'ecommerce',
      preserve : ['markdown', 'html', 'placeholders'],
      glossary : {},
    });

    res.status(200).send({ corrected_text: correctText });

  } catch (error) {
    console.error('Error consultation:', error);
    res.status(500).send('Error consultation');
  }
}

const detectLanguageISO = async (req, res) => {
  try {
    const openai = new OpenAiApiService();

    const { text } = req.body;

    const iso_lang = await openai.detectLanguageISO(text);

    res.status(200).send({ langue: iso_lang });

  } catch (error) {
    console.error('Error consultation:', error);
    res.status(500).send('Error consultation');
  }
}

module.exports = { 
  translate,
  detectLanguageISO,
  correctText
};