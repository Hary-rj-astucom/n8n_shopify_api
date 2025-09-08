const { createLogger, format, transports } = require('winston');
const path = require('path');

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special regex characters
}

function stripHtmlTags(input) {
    if(input != "" && input != null){
        return input.replace(/<[^>]*>/g, '');    
    }else{
        return "";
    }
    
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