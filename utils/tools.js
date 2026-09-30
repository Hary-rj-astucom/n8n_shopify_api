const { createLogger, format, transports } = require('winston');
const path = require('path');

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special regex characters
}

function stripHtmlTags(html) {
    if (!html) return '';

  const entities = {
    '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>',
    '&quot;': '"', '&#39;': "'", '&apos;': "'",
    '&euro;': '€', '&eacute;': 'é', '&egrave;': 'è', '&agrave;': 'à',
    '&ecirc;': 'ê', '&ccedil;': 'ç', '&ocirc;': 'ô', '&ugrave;': 'ù',
  };

  return html
    // Supprime head, style, script et commentaires (dont les commentaires conditionnels Outlook)
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    // Balises de bloc -> retours à la ligne
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h[1-6]|table|blockquote)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' ')
    // Supprime toutes les autres balises
    .replace(/<[^>]+>/g, '')
    // Entités nommées courantes
    .replace(/&[a-z]+;|&#39;/gi, (m) => entities[m.toLowerCase()] ?? m)
    // Entités numériques (&#233; et &#xE9;)
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    // Nettoyage des espaces
    .replace(/\r/g, '')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const quoteSql = (input) => {
    if(input != "" && input != null){
        return input.replace(/'/g, "''");   
    }else{
        return "";
    }
}

function roundToNthDecimal(num, places) {
  const multiplier = Math.pow(10, places);
  return Math.round(num * multiplier) / multiplier;
}

/**
 * Crée un logger Winston avec un nom de fichier personnalisé.
 * @param {string} filename - Nom du fichier log (ex: 'server.log')
 * @returns Winston Logger
 */
function createCustomLogger(filename = 'app.log') {
    const logger = createLogger({
        level: 'info',
        format: format.combine(
            format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            format.printf(({ timestamp, level, message }) => {
                return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
            })
        ),
        transports: [
            new transports.File({ filename: path.join(__dirname, filename) }),
            new transports.Console()
        ],
    });

    return logger;
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

module.exports = { stripHtmlTags, quoteSql, roundToNthDecimal, createCustomLogger, isObject };