require('dotenv').config();
const axios = require('axios');
const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const path = require("path");
const { PDFDocument } = require("pdf-lib");

const OpenAiApiService = require('../services/OpenAiApiService');

const TRACKING_URLS = {
  colissimo: (n) => `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(n)}`,
  chronopost: (n) => `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${encodeURIComponent(n)}`,
  mondialrelay: (n) => `https://www.mondialrelay.fr/suivi-de-colis?numeroExpedition=${encodeURIComponent(n)}`,
};

const magento = axios.create({
  baseURL: `${process.env.MAGENTO_URL}/rest/V1`,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.MAGENTO_ACCESS_TOKEN}` // Utiliser un token admin ou integration
  }
});

function buildTrackingUrl(track) {
  const code = (track.carrier_code || track.title || "").toLowerCase();
  const key = Object.keys(TRACKING_URLS).find((k) => code.includes(k));
  return key ? TRACKING_URLS[key](track.track_number) : null;
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
    const order_result = orderResponse.data.items[0];

    // 2. get shippement info
    const searchCriteria2 = `searchCriteria[filter_groups][0][filters][0][field]=order_id` + 
        `&searchCriteria[filter_groups][0][filters][0][value]=${order_result.entity_id}` + 
        `&searchCriteria[filter_groups][0][filters][0][condition_type]=eq`

    const shippementResponse = await magento.get(`/shipments?${searchCriteria2}`);
    const trackData = shippementResponse.data.items
    ?.flatMap(s => s.tracks || [])
    .find(Boolean);

    const tracks = trackData
    ? { ...trackData, trackingUrl: buildTrackingUrl(trackData) }
    : null;

    const order = {
        ...order_result, 
        tracks
    };

    return {
      order
    };

  } catch (error) {
    console.log(error);
    console.error('Erreur_Magento:', error.response?.data || error.message);
    throw error;
  }
}

//Invoice data
function convertInvoiceItems(invoiceItems) {
  // 1️⃣ Séparer les parents et les enfants
  const parents = {};
  const children = {};

  invoiceItems.forEach(item => {
    if (item.base_price > 0) {
      parents[item.entity_id] = item;
    } else {
      children[item.entity_id] = item;
    }
  });

  // 2️⃣ Associer les enfants à leur parent (même SKU)
  const merged = Object.values(parents).map(parent => {
    // trouver le child avec même sku (peut être absent maintenant)
    const child = Object.values(children).find(c => c.sku === parent.sku);

    const finalName = parent.name;

    // Pas de child trouvé => pas de variation à extraire
    const variation = child
      ? child.name.replace(parent.name, "").trim()
      : "";

    // 3️⃣ Calcul TVA%
    const taxPercent =
      parent.price > 0
        ? Math.round((parent.tax_amount / parent.price) * 100)
        : 0;

    return {
      sku: parent.sku,
      name: finalName.replace(/\s+/g, " ").trim(),
      variation,
      qty: parent.qty,
      unit_price_ht: parent.base_price,
      unit_price_ttc: parent.base_price_incl_tax || parent.price_incl_tax,
      tax_percent: taxPercent
    };
  });

  return merged;
}
// create invoice html
function createHtmlInvoice(data){
  return `<!DOCTYPE html>
    <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <title>Facture</title>

            <style>
                @page {
                    size: A4;
                    margin: 5mm; /* marge basse pour éviter que le contenu touche le footer */
                }

                body {
                    font-family: Arial, sans-serif;
                    color: #333;
                    margin: 0;
                    padding: 0;
                }

                .container {
                    width: 100%;
                    padding: 20px;
                    box-sizing: border-box;
                }

                .title {
                    margin-bottom: 30px;
                    font-size: 28px;
                    font-weight: bold;
                }

                .section {
                    margin-bottom: 25px;
                }

                .section-title {
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 5px;
                }

                .info-table {
                    width: 65%;
                    border-collapse: collapse;
                    margin-top: 5px;
                }

                .info-table td {
                    border: none;
                    padding: 3px;
                }

                .double-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }

                .double-table td {
                    padding: 10px;
                    vertical-align: top;
                }

                .double-table-header td {
                    font-weight: bold;
                    padding-bottom: 5px;
                }

                .double-table-body td {
                    border: 1px solid #333;
                }

                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }

                .items-table th,
                .items-table td {
                    border-bottom: 1px solid #999;
                    padding: 10px;
                    width: max-content;
                }

                .items-table .no_border td {
                    border: none;
                    padding: 10px;
                    width: max-content;
                }

                .items-table th {
                    background: #f2f2f2;
                    font-weight: bold;
                    text-align: center;
                }

                .items-table td {
                    text-align: center;
                }

                .total {
                    text-align: right;
                    margin-top: 20px;
                    font-size: 18px;
                    font-weight: bold;
                }

                .footer {
                    top: 0;
                    width: 100%;
                    border-bottom: 1px solid #ccc;
                    padding: 5px 10px;
                    font-size: 10px;
                    background: #fff;
                    margin-top: 0px; /* pour séparer du contenu */
                }

                .triple-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 5px;
                }

                .triple-table td {
                    padding: 5px;
                    vertical-align: top;
                }

            </style>
        </head>
        <body>
            <div  class="footer">
                <table class="triple-table">
                    <tr>
                        <td>
                            COSMA PARFUMERIES S.A au Capital de 1 216 600 €<br>
                            384 736 666 R.C.S. Versailles<br>
                            SIRET 384 736 666 00072<br>
                            TVA FR26 384 736 666
                        </td>
                        <td>
                            Siège social<br>
                            17 Route des Boulangers<br>
                            78530 BUC - FRANCE<br>
                            Tél. : 01 56 83 84 88
                        </td>
                        <td>
                            E-commerce : cosma-parfumeries.com<br>
                            17 Route des Boulangers<br>
                            78530 BUC - FRANCE<br>
                            Tél. : 01 56 83 84 88
                        </td>
                    </tr>
                </table>
            </div>
            <div class="container">

                <h1 class="title">
                    <img src="https://www.cosma-parfumeries.com/media/logo/websites/1/LOGO_1.png"  width="230px">
                </h1>

                <div class="section">
                    <table class="info-table">
                        <tr>
                            <td><b>Facture :</b></td>
                            <td>${data.invoice.invoice_number}</td>
                        </tr>
                        <tr>
                            <td><b>Date de facturation :</b></td>
                            <td>${data.invoice.invoice_created_at}</td>
                        </tr>
                        <tr>
                            <td><b>Commande :</b></td>
                            <td>${data.order_number}</td>
                        </tr>
                        <tr>
                            <td><b>Date de commande :</b></td>
                            <td>${data.order_created_at}</td>
                        </tr>
                    </table>
                </div>

                <div class="section">
                    <table class="double-table">
                        <tr class="double-table-header">
                            <td style="width: 50%;"><b>Adresse de facturation</b></td>
                            <td><b>Adresse de livraison</b></td>
                        </tr>
                        <tr class="double-table-body">
                            <td>
                                ${data.billing_address.firstname} ${data.billing_address.lastname}<br>
                                ${
                                  data.billing_address.street.map(item => `
                                    ${item}<br>
                                  `).join('')
                                }
                                ${data.billing_address.postcode} ${data.billing_address.city}<br>
                                ${data.billing_address.country}<br>
                                T: ${data.billing_address.telephone}
                            </td>
                            <td>
                                ${data.shipping_address.firstname} ${data.shipping_address.lastname}<br>
                                ${
                                  data.shipping_address.street.map(item => `
                                    ${item}<br>
                                  `).join('')
                                }
                                ${data.shipping_address.postcode} ${data.shipping_address.city}<br>
                                ${data.shipping_address.country}<br>
                                T: ${data.shipping_address.telephone}
                            </td>
                        </tr>
                    </table>
                </div>

                <div class="section">
                    <table class="double-table">
                        <tr class="double-table-header">
                            <td style="width: 50%;"><b>Mode de paiement</b></td>
                            <td><b>Méthode de livraison</b></td>
                        </tr>
                        <tr class="double-table-body">
                            <td>
                                ${data.payment.method} ${data.payment.type}<br>
                                Ref: ${data.payment.transaction_id}
                            </td>
                            <td>
                                ${data.shipping_address.method}
                            </td>
                        </tr>
                    </table>
                </div>

                <h3>Résumé de la commande</h3>

                <table class="items-table">
                    <tr>
                        <th>Référence</th>
                        <th>Désignation</th>
                        <th>Prix</th>
                        <th>Qté</th>
                        <th>Sous-total</th>
                    </tr>

                    ${
                        data.invoice.items.map(item => `
                          <tr>
                              <td>
                                  ${item.sku}<br>
                                  ${item.variation}
                              </td>
                              <td> ${item.name}</td>
                              <td>${item.unit_price_ttc} ${data.currency}</td>
                              <td>${item.qty}</td>
                              <td>${(item.unit_price_ttc * item.qty).toFixed(2)} ${data.currency}</td>
                          </tr>
                        `).join('')
                      }

                    <tr class="no_border">
                        <td></td>
                        <td></td>
                        <td>Sous-total :</td>
                        <td></td>
                        <td>${data.totals.subtotal_ht} ${data.currency}</td>
                    </tr>
                    <tr class="no_border">
                        <td></td>
                        <td></td>
                        <td>TVA :</td>
                        <td></td>
                        <td>${data.totals.tax} ${data.currency}</td>
                    </tr>
                    <tr class="no_border">
                        <td></td>
                        <td></td>
                        <td><b>Total :</b></td>
                        <td></td>
                        <td><b>${data.totals.grand_total_ttc} ${data.currency}</b></td>
                    </tr>
                </table>

            </div>
        </body>
    </html>
`;
}

async function getInvoicePDF(orderNumber, langue, baseUrl = process.env.BASE_URL_APP) {
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

    let data = {
      "order_id": order.entity_id,
      "order_number": order.increment_id,
      "order_created_at": order.created_at,
      "status": order.status,
      "currency": order.order_currency_code,
      "totals": {
        "subtotal_ht": order.subtotal_invoiced,
        "tax": order.tax_invoiced,
        "shipping": order.shipping_amount,
        "discount": order.discount_invoiced,
        "grand_total_ttc": order.total_invoiced
      },
      "customer": {
        "id": order.customer_id,
        "firstname": order.billing_address.firstname,
        "lastname": order.billing_address.lastname,
        "email": order.billing_address.email,
        "is_guest": false
      },
      "billing_address": {
        "firstname": order.billing_address.firstname,
        "lastname": order.billing_address.lastname,
        "street": order.billing_address.street,
        "city": order.billing_address.city,
        "postcode": order.billing_address.postcode,
        "country": order.billing_address.country_id,
        "telephone": order.billing_address.telephone
      },
      "shipping_address": {
        "firstname": order.billing_address.firstname,
        "lastname": order.billing_address.lastname,
        "street": order.extension_attributes.shipping_assignments[0].shipping.address.street,
        "city": order.extension_attributes.shipping_assignments[0].shipping.address.city,
        "postcode": order.extension_attributes.shipping_assignments[0].shipping.address.postcode,
        "country": order.extension_attributes.shipping_assignments[0].shipping.address.country_id,
        "telephone": order.extension_attributes.shipping_assignments[0].shipping.address.telephone,
        "method": order.shipping_description
      },
      "payment": {
        "method": order.payment.method,
        "type": order.payment.cc_type,
        "amount_paid": order.payment.base_amount_paid1,
        "status": order.payment.cc_status_description,
        "transaction_id": order.payment.last_trans_id
      },
      "invoice": {
        "invoice_number": invoices[0].increment_id,
        "invoice_created_at": invoices[0].created_at,
        "items": convertInvoiceItems(invoices[0].items)
      }
    }

    // HTML invoice
    const html = createHtmlInvoice(data);

    //Translate HTML
    const openai = new OpenAiApiService();
    const html_translated = await openai.translate(html, {target: langue});

    // Générer PDF normal
    const browser = await puppeteer.launch({
        headless: "new",
        //executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setContent(html_translated, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true
    });
    await browser.close();

    // Charger PDF dans pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    // Exporter PDF protégé
    const protectedPdf = await pdfDoc.save();

    // Sauvegarder dans un dossier
    const filename = `${orderNumber}.pdf`;
    const outputPath = path.join(__dirname, "../public/uploads/invoices", filename);

    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, protectedPdf);

    const finalUrl = `${baseUrl}/public/uploads/invoices/${encodeURIComponent(filename)}`;

    // Retourner infos
    return {
        invoice_link: finalUrl
    };
    
  } catch (error) {
    console.error('Erreur_Magento:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { 
  getOrderWithTransactionsByNumber, 
  getInvoicePDF
};