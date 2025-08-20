const xlsx = require('xlsx');
const path = require('path');

const createExcelSheetFromData = (manipulatedData, head=[]) => {
  return new Promise((resolve, reject) => {
    try {
      const data = [];
      if (manipulatedData.length > 0) {

        if(head.length > 0){
            data.push(head);
        }else{
            // Extract the column names as headers
            const headers = Object.keys(manipulatedData[0]);
            data.push(headers);
        }

        // Add the rows of data
        manipulatedData.forEach(row => {
          data.push(Object.values(row));
        });

        // Create a new workbook
        const ws = xlsx.utils.aoa_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');

        // Write the Excel file synchronously
        const filePath = path.join(__dirname, '..', 'output.xlsx');
        xlsx.writeFile(wb, filePath);
        resolve(filePath); // Return the file path for download
      } else {
        reject('No data found after manipulation');
      }
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { createExcelSheetFromData };