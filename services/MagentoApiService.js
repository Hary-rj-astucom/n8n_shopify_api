require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const magento = axios.create({
  baseURL: `${process.env.MAGENTO_URL}/rest/V1`,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.MAGENTO_ACCESS_TOKEN}` // Utiliser un token admin ou integration
  }
});

async function getInvoicePDF(numero_commande, invoiceId, baseUrlFile = "https://dev-ia.astucom.com/n8n_cosmia") {
  try {
    const response = await magento.get(`/invoices/${invoiceId}/pdf`);
    const pdfBase64 = response.data;

    const buffer = Buffer.from(pdfBase64, 'base64');

    const uploadDir = path.join(__dirname, '../public/uploads/invoices');
    fs.mkdirSync(uploadDir, { recursive: true });

    const filename = `${numero_commande}_${invoiceId}.pdf`;
    const filePath = path.join(uploadDir, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Fichier existant supprimé : ${filename}`);
    }

    fs.writeFileSync(filePath, buffer);
    const finalUrl = `${baseUrlFile}/public/uploads/invoices/${encodeURIComponent(filename)}`;

    return finalUrl;

  } catch (error) {
    console.error("Erreur PDF invoice:", error.response?.data || error.message);
    throw error;
  }
}

async function getOrderWithTransactionsByNumber(orderNumber) {
  try {

    // 1. Rechercher la commande via increment_id
    const searchCriteria = `searchCriteria[filter_groups][0][filters][0][field]=increment_id` +
      `&searchCriteria[filter_groups][0][filters][0][value]=${orderNumber}` +
      `&searchCriteria[filter_groups][0][filters][0][condition_type]=eq`;

    const orderResponse = await magento.get(`/orders?${searchCriteria}`);

    if (!orderResponse.data.items || orderResponse.data.items.length === 0) {
      throw new Error(`Commande ${orderNumber} introuvable`);
    }
    const order = orderResponse.data.items[0];

    // 2. Récupérer les factures liées via order_id
    const invoiceSearch =
      `searchCriteria[filter_groups][0][filters][0][field]=order_id` +
      `&searchCriteria[filter_groups][0][filters][0][value]=${order.entity_id}` +
      `&searchCriteria[filter_groups][0][filters][0][condition_type]=eq`;

    const invoiceResponse = await magento.get(`/invoices?${invoiceSearch}`);

    const invoices = invoiceResponse.data.items || [];

    // Ajouter le lien PDF
    for (let invoice of invoices) {
      const pdfUrl = await getInvoicePDF(orderNumber, invoice.entity_id);
      invoice.pdf_link = pdfUrl;
    }

    return {
      order,
      invoices
    };

  } catch (error) {
    console.error('Erreur_Magento:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { getOrderWithTransactionsByNumber };