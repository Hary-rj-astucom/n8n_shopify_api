require('dotenv').config();
const OpenAI = require('openai');

class OpenAiService {
  constructor(apiKey = process.env.OPENAI_SECRET_KEY, model = process.env.OPENAI_MODEL) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required.');
    }
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  buildTranslatorInstructions({
    target = 'fr',
    formality = 'courtois', // "formal" | "informal" | "neutral" | "courtois"
    domain = null,
    preserve = ['markdown', 'html', 'placeholders'],
    glossary = {},
  } = {}) {
    const preserveHints = {
      markdown: 'Préserve **strictement** la structure Markdown.',
      html: 'Préserve **strictement** les balises HTML et attributs.',
      placeholders: 'Préserve les variables/placeholder ({{name}}, %s, etc.).',
    };

    const preserveText = preserve
      .filter(k => preserveHints[k])
      .map(k => `- ${preserveHints[k]}`)
      .join('\n');

    const glossaryLines = Object.entries(glossary)
      .map(([src, tgt]) => `- "${src}" → "${tgt}"`)
      .join('\n') || '- (aucun)';

    // Ajustement pour la "courtoisie"
    let formalityText;
    switch (formality) {
      case 'formal':
        formalityText = 'Langage formel, professionnel.';
        break;
      case 'informal':
        formalityText = 'Langage informel, amical.';
        break;
      case 'courtois':
        formalityText = 'Langage courtois, poli et respectueux (comme dans une correspondance professionnelle soignée).';
        break;
      default:
        formalityText = 'Langage neutre.';
    }

    const domainNote = domain
      ? `Adapte la terminologie au domaine: **${domain}**.`
      : 'Adapte la terminologie au contexte général.';

    return `
        Tu es un traducteur professionnel.
        - Détecte automatiquement la langue source.
        - Traduction cible: **${target}**.
        - Niveau de langage: **${formalityText}**
        - ${domainNote}
        - Préservation de format :
        ${preserveText || '- (aucune)'}
        - Glossaire :
        ${glossaryLines}
      `.trim();
  }

  async translate(text, options = {}) {
    if (!text) throw new Error('No text provided for translation');

    const instructions = this.buildTranslatorInstructions(options);

    const response = await this.client.responses.create({
      model: this.model,
      instructions,
      input: [{ role: 'user', content: text }],
    });

    return response.output_text ?? '';
  }

  /**
 * Détecte la langue d'un texte et renvoie le code ISO 639-1
 * @param {string} text - Le texte à analyser
 * @returns {Promise<string>} - Code ISO de la langue (ex: "fr", "en", "es")
 */
  async detectLanguageISO(text) {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "Tu es un détecteur de langue. Réponds uniquement avec le code ISO 639-1 de la langue du texte fourni (ex: fr, en, es, de, it)."
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0,
      });

      return response.choices[0].message.content.trim();

    } catch (error) {
      console.error("Erreur lors de la détection de langue:", error);
      throw error;
    }
  }
  
}

module.exports = OpenAiService;