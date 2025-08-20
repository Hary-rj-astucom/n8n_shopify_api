const fs = require('fs');
const path = require('path');
const { parse } = require('json2csv');

const renameKeys = (obj, keyMap) => {
    return Object.keys(obj).reduce((newObj, key) => {
        const newKey = keyMap[key] || key;
        newObj[newKey] = obj[key];
        return newObj;
    }, {});
};

const renameKeysInArray = async (arr, keyMap) => {
    return await Promise.all(arr.map(async obj => renameKeys(obj, keyMap)));
};

const createCSVFromData = (manipulatedData) => {
    return new Promise((resolve, reject) => {
        try {
            if (manipulatedData.length === 0) {
                return reject('No data found after manipulation');
            }

            let csv = parse(manipulatedData);
            const filePath = path.join(__dirname, '..', 'output.csv');
            
            // Ensure the output directory exists
            if (!fs.existsSync(path.dirname(filePath))) {
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
            }

            fs.writeFileSync(filePath, csv, 'utf8');
            resolve(filePath);
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = { createCSVFromData, renameKeysInArray };