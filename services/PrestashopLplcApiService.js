require('dotenv').config();
const axios = require('axios');
const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const path = require("path");
const { PDFDocument } = require("pdf-lib");

// Configuration de l'API PrestaShop
const apiKey = process.env.PRESTASHOP_LCLP_API_KEY;

const shopUrlLclp = process.env.PRESTASHOP_LCLP_URL;
const apiUrlLclp = `${shopUrlLclp}/api/`;

// Garde-fou pagination, même principe que côté Magento : borne le
// nombre de résultats entre 1 et 10 (5 par défaut).
const DEFAULT_PAGE_SIZE = 1;
const MAX_PAGE_SIZE = 10;
function normalizeLimit(limit) {
  const n = parseInt(limit, 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
}

const TRACKING_URLS = {
  colissimo: (n) => `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(n)}`,
  chronopost: (n) => `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${encodeURIComponent(n)}`,
  mondialrelay: (n) => `https://www.mondialrelay.fr/suivi-de-colis?numeroExpedition=${encodeURIComponent(n)}`,
};

function buildTrackingUrl(carrier, track_number) {
  const code = (carrier.external_module_name || "").toLowerCase();
  const key = Object.keys(TRACKING_URLS).find((k) => code.includes(k));
  return key ? TRACKING_URLS[key](track_number) : null;
}

// Fonction générique pour appeler l'API PrestaShop
async function callPrestaShopAPI(url) {
  try {
    console.log(url);
    const response = await axios.get(url, {
      auth: {
        username: apiKey,
        password: "",
      },
      timeout: 30000,
      httpsAgent: new (await import("https")).Agent({ rejectUnauthorized: false }),
    });

    return response.data;
  } catch (error) {
    console.log(error);
    if (error.response) {
      throw new Error(`Erreur HTTP: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else {
      throw new Error(`Erreur Axios: ${error.message}`);
    }
  }
}

// Récupérer une commande spécifique
async function getOrderById(apiUrl, order_id) {
  const url = `${apiUrl}orders/${order_id}?output_format=JSON`;
  const data = await callPrestaShopAPI(url);
  return data.order ?? null;
}

// Récupérer un client par ID
async function getCustomerById(apiUrl, customerId) {
  const url = `${apiUrl}customers/${customerId}?output_format=JSON`;
  const data = await callPrestaShopAPI(url);
  return data.customer ?? null;
}

// Récupérer un statut de commande
async function getOrderStateById(apiUrl, stateId) {
  const url = `${apiUrl}order_states/${stateId}?output_format=JSON`;
  const data = await callPrestaShopAPI(url);
  return data.order_state ?? null;
}

// Récupérer les produits d’une commande
async function getOrderDetails(apiUrl, order_id) {
  const url = `${apiUrl}order_details?filter[id_order]=${order_id}&display=full&output_format=JSON`;
  const data = await callPrestaShopAPI(url);
  return data.order_details ?? [];
}

// Recuperer les information de transaction
async function getOrderPayement(apiUrl, order_id) {
  const url = `${apiUrl}order_payments?filter[order_reference]=${order_id}&output_format=JSON`;
  const data = await callPrestaShopAPI(url);
  let result = [];
  if(data.order_payments){
    if(data.order_payments.length > 0){
      for(let a=0; a<data.order_payments.length; a++){
        result.push(await getOrderPayementDetail(apiUrl, data.order_payments[0].id)); 
      }
      return result;    
    }else{
      return [];
    }
  }else{
    return [];
  }
}

// Recuperation des data de l'info payement
async function getOrderPayementDetail(apiUrl, order_payment_id) {
  const url = `${apiUrl}order_payments/${order_payment_id}?output_format=JSON&display=full`;
  const data = await callPrestaShopAPI(url);
  return data.order_payment ?? [];
}

async function getTracking(apiUrl, orderId) {
  try {
    const url = `${apiUrl}order_carriers?filter[id_order]=${orderId}&display=full&output_format=JSON`;
    const data = await callPrestaShopAPI(url);
    const orderCarriers = data.order_carriers ?? [];

    const tracks = [];
    for (const oc of orderCarriers) {

      if(oc.id_carrier){

        const carrier_url = `${apiUrl}carriers/${oc.id_carrier}&output_format=JSON`;
        const data2 = await callPrestaShopAPI(carrier_url);

        const url = buildTrackingUrl(data2.carrier, oc.tracking_number);

        tracks.push({
          id_carrier: oc.id_carrier,
          carrier_name: data2.carrier.name ? data2.carrier.name : null,
          tracking_number: oc.tracking_number,
          tracking_url: oc.tracking_number ? url : null
        });

      }
      else {
        tracks.push({
          id_carrier: null,
          carrier_name: null,
          tracking_number: null,
          tracking_url: null
        });
      }
      
    }

    return { tracks };

  } catch (error) {
    console.log(error);
    throw error;
  }
}

// Recuperation de l'order selon la reference du client
async function getOrderByReferenceNum(apiUrl, reference) {
  const url = `${apiUrl}orders?filter[reference]=${reference}&output_format=JSON`;
  const data = await callPrestaShopAPI(url);
  if(data.length == 0){
    return null;
  }else{
    return data.orders[0].id ?? null;
  }
}

//avoir les donnees avec les references
async function getOrderByReference(reference, apiUrl = apiUrlLclp, boutique = "Lclp"){
  try {
    //verification de tout les boutiques
    let order_id = await getOrderByReferenceNum(apiUrl, reference);
    if(!order_id){
      throw new Error("Commande non trouvée ou erreur lors de la récupération");
    }

    const order = await getOrderById(apiUrl, order_id);
    if (!order) throw new Error("Commande non trouvée ou erreur lors de la récupération");

    let customer = null;
    if (order.id_customer) {
      customer = await getCustomerById(apiUrl, order.id_customer);
      console.log(customer ? "Informations client récupérées !" : "Impossible de récupérer les infos client");
    }

    let orderState = null;
    if (order.current_state) {
      orderState = await getOrderStateById(apiUrl, order.current_state);
      console.log(orderState ? "Statut récupéré !" : "Impossible de récupérer le statut");
    }

    const orderDetails = await getOrderDetails(apiUrl, order_id);
    console.log(orderDetails.length > 0 ? `${orderDetails.length} produit(s) récupéré(s)` : "Aucun produit trouvé");

    const transaction_details = await getOrderPayement(apiUrl, reference);
    console.log(transaction_details ? "detail payment récupéré !" : "Impossible de récupérer le detail payment");

    const tracking = await getTracking(apiUrl, order_id);
    console.log(tracking ? "detail tracking récupéré !" : "Impossible de récupérer le detail payment");

    return {
      by: "order_number",
      boutique,
      order,
      customer,
      orderState,
      orderDetails,
      transaction_details,
      tracking
    }
    
  } catch (err) {
    console.error("Erreur:", err.message);
    throw err;
  }
}

// ============================================================
// Commandes par email client
// ============================================================

// Retrouve l'id client PrestaShop correspondant à un email
async function getCustomerIdByEmail(email, apiUrl = apiUrlLclp) {
  const url = `${apiUrl}customers?filter[email]=${encodeURIComponent(email)}&output_format=JSON`;
  const data = await callPrestaShopAPI(url);
  const customers = data.customers || [];
  return customers[0]?.id ?? null;
}

// Commandes d'un client (déjà identifié par id)
// plus élevé correspondant à une commande plus récente.
async function getOrdersByCustomerId(customerId, apiUrl = apiUrlLclp, limit = DEFAULT_PAGE_SIZE) {
  const url =
    `${apiUrl}orders?filter[id_customer]=${customerId}` +
    `&sort=id_DESC&limit=0,${limit}` +
    `&display=[id,reference,total_paid,current_state]` +
    `&output_format=JSON`;
  const data = await callPrestaShopAPI(url);
  return data.orders || [];
}

// Dernières commandes d'un client à partir de son email
async function getOrdersByEmail(email, apiUrl = apiUrlLclp, boutique = "Lclp") {
  try {
    const limit = 1;
    const pageSize = normalizeLimit(limit);

    const customerId = await getCustomerIdByEmail(email, apiUrl);
    if (!customerId) {
      throw new Error(`Aucun client trouvé pour l'email "${email}"`);
    }

    const orders = await getOrdersByCustomerId(customerId, apiUrl, pageSize);
    const results = orders.map((o) => ({ boutique: "LCLP", ...o }));

    if (results.length === 0) {
      throw new Error(`Aucune commande trouvée pour l'email "${email}"`);
    }

    // Tri du plus récent au plus ancien (id décroissant, cf. note ci-dessus)
    results.sort((a, b) => Number(b.id) - Number(a.id));
    const lastOrder = results.slice(0, pageSize);
    const order_id =  lastOrder[0].id;
    const reference = lastOrder[0].reference;

    const order = await getOrderById(apiUrl, order_id);
    if (!order) throw new Error("Commande non trouvée ou erreur lors de la récupération");

    let customer = null;
    if (order.id_customer) {
      customer = await getCustomerById(apiUrl, order.id_customer);
      console.log(customer ? "Informations client récupérées !" : "Impossible de récupérer les infos client");
    }

    let orderState = null;
    if (order.current_state) {
      orderState = await getOrderStateById(apiUrl, order.current_state);
      console.log(orderState ? "Statut récupéré !" : "Impossible de récupérer le statut");
    }

    const orderDetails = await getOrderDetails(apiUrl, order_id);
    console.log(orderDetails.length > 0 ? `${orderDetails.length} produit(s) récupéré(s)` : "Aucun produit trouvé");

    const transaction_details = await getOrderPayement(apiUrl, reference);
    console.log(transaction_details ? "detail payment récupéré !" : "Impossible de récupérer le detail payment");

    const tracking = await getTracking(apiUrl, order_id);
    console.log(tracking ? "detail tracking récupéré !" : "Impossible de récupérer le detail payment");

    return {
      by: "email",
      boutique,
      order,
      customer,
      orderState,
      orderDetails,
      transaction_details,
      tracking
    }

  } catch (error) {
    console.error("Erreur:", error.message);
    throw error;
  }
}

//----------------------------------------------------------------//
//            Recuperation complete des information               //
//----------------------------------------------------------------// 

async function getOrderByRefOrByEmail(reference, email, apiUrl = apiUrlLclp, boutique = "Lclp"){
  try {
    if(reference){
      try{
        const order = await getOrderByReference(reference, apiUrl = apiUrlLclp, boutique = "Lclp");
        //verifier le propietaire de la commande 
        if(order.customer.email != email){
          return { "message ": "L’adresse e-mail fournie ne correspond pas à celle associée à la commande." };
        }
        return order;
      } catch(error) {
        console.log("switch to email searching : ", error.message);
        return await getOrdersByEmail(email, apiUrl = apiUrlLclp, boutique = "Lclp");
      }
    }else{
      return await getOrdersByEmail(email, apiUrl = apiUrlLclp, boutique = "Lclp");
    }
  } catch(error) {
    console.error("Erreur:", error.message);
    return { "message ": error.message };
  }
}

//----------------------------------------------------------------//
//            Generer facture d'une commande                      //
//----------------------------------------------------------------//

// avoir l'address 
async function getAddress(address_id, apiUrl){
  const url = `${apiUrl}addresses?filter[id]=${address_id}&display=full&output_format=JSON`;
  const data = await callPrestaShopAPI(url);
  return data.addresses ?? null;
}

// avoir le pays
async function getCountryName(country_id, apiUrl){
  const url = `${apiUrl}countries?filter[id]=${country_id}&display=full&output_format=JSON`;
  const data = await callPrestaShopAPI(url);
  return data.countries[0].name[0].value ?? null;
}

// avoir le dernier order id par mail
async function getLatestOrderIdByEmail(email, apiUrl) {
  const customerId = await getCustomerIdByEmail(email, apiUrl);
  if (!customerId) {
    throw new Error(`Aucun client trouvé pour l'email "${email}"`);
  }

  const orders = await getOrdersByCustomerId(customerId, apiUrl, normalizeLimit(1));
  if (!orders?.length) {
    throw new Error(`Aucune commande trouvée pour l'email "${email}"`);
  }

  // La plus récente = l'id le plus élevé
  return orders.reduce((latest, o) => (Number(o.id) > Number(latest.id) ? o : latest)).id;
}

// recuperation de donnee de facturation 
async function getOrderInvoiceById(order_id, apiUrl){
  const url = `${apiUrl}order_invoices?filter[id_order]=${order_id}&display=full&output_format=JSON`;
  const data = await callPrestaShopAPI(url);
  return data.order_invoices ?? null;
}

// creation de la facture
async function createHtmlInvoice(data){

  let products = "";
  await data.products.forEach(element => {
    products += `<tr>
                  <td>${element.reference}</td>
                  <td>${element.name}</td>
                  <td>${element.taxRate} %</td><td>---</td><td>${element.unitHT}</td><td>---</td><td>${element.qty}</td><td>${element.totalHT}</td>
                </tr>`
  });

  return `<!DOCTYPE html>
            <html lang="fr">
            <head>
            <meta charset="UTF-8">
            <title>Facture #P741700</title>
            <style>
              @page { size: A4; margin: 15mm; }
              * { box-sizing: border-box; }
              body { font-family: "DejaVu Sans", Arial, sans-serif; font-size: 13px; color: #222; margin: 0; padding: 24px; max-width: 780px; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; }
              .logo { font-size: 26px; font-weight: bold; }
              .logo span { color: #9b2a5e; }
              .logo small { font-size: 12px; font-weight: normal; color: #666; }
              .title { text-align: right; font-size: 20px; color: #666; line-height: 1.3; }
              .title .sub { color: #999; font-size: 20px; }
              .addresses { display: flex; margin-top: 60px; }
              .addresses > div { width: 33.33%; line-height: 1.4; }
              .addresses h4 { margin: 0 0 30px; font-weight: normal; font-size: 15px; }
              .addresses .shop { padding-top: 0; margin-top: 45px; }
              table { width: 100%; border-collapse: collapse; }
              .meta { margin-top: 45px; border-top: 1px solid #999; border-bottom: 1px solid #999; }
              .meta th { background: #eee; font-weight: normal; padding: 6px; text-align: center; }
              .meta td { text-align: center; font-size: 10px; padding: 6px; }
              .items { margin-top: 24px; border-bottom: 1px solid #999; }
              .items th { background: #eee; font-weight: normal; padding: 6px; text-align: right; vertical-align: bottom; }
              .items th:nth-child(1), .items th:nth-child(2) { text-align: left; }
              .items td { padding: 8px 6px; text-align: right; vertical-align: top; }
              .items td:nth-child(1), .items td:nth-child(2) { text-align: left; }
              .bottom { display: flex; justify-content: space-between; margin-top: 16px; align-items: flex-start; }
              .left { width: 47%; }
              .box { border: 1px solid #222; }
              .taxes { margin-bottom: 14px; }
              .taxes th { background: #eee; font-weight: normal; padding: 6px; text-align: left; }
              .taxes td { padding: 6px; }
              .taxes th:last-child, .taxes td:last-child { text-align: right; }
              .pay { font-size: 10px; border: 1px solid #999; }
              .pay td { padding: 6px 10px; }
              .pay td:first-child { background: #eee; text-align: center; width: 38%; }
              .totals { width: 47%; }
              .totals td { padding: 6px 10px; text-align: right; }
              .totals td:last-child { width: 90px; }
              .totals tr.grand td { font-size: 16px; padding: 10px; }
              .totals tr.grand { border-top: 1px solid #222; }
            </style>
            </head>
            <body>
            
            <div class="header">
              <div class="logo">Lclp-<span>parfums</span><small>.com</small></div>
              <div class="title">FACTURE<br><span class="sub">${data.invoiceDate}<br>${data.invoiceNumber}</span></div>
            </div>
            
            <div class="addresses">
              <div class="shop">
                <h4>SAS ADV LES PARFUMS</h4>
                28 Rue Nicéphore Niepce<br>
                71400 AUTUN<br>
                France<br>
                E-mail: contact@lesparfumslescapillaires.com<br>
                Numéro d'immatriculation RCS :<br>
                42341657700132<br>
                Numéro de TVA: FR17423416577<br>
                EORI: FR49763252100025<br>
              </div>
              <div>
                <h4>Adresse de livraison</h4>
                ${data.delivery_address.customer_name}<br>
                ${data.delivery_address.company}<br>
                ${data.delivery_address.address1}<br>
                ${data.delivery_address.codePostal}<br>
                ${data.delivery_address.country}<br>
                ${data.delivery_address.phone}<br>
                ${data.delivery_address.phone_mobile}
              </div>
              <div>
                <h4>Adresse de facturation</h4>
                ${data.billing_address.customer_name}<br>
                ${data.billing_address.company}<br>
                ${data.billing_address.address1}<br>
                ${data.billing_address.codePostal}<br>
                ${data.billing_address.country}<br>
                ${data.billing_address.phone}<br>
                ${data.billing_address.phone_mobile}
              </div>
            </div>
            
            <table class="meta">
              <tr>
                <th>Numéro de facture</th><th>Date de facturation</th><th>Réf. de commande</th><th>Date de commande</th>
              </tr>
              <tr>
                <td>${data.invoiceNumber}</td><td>${data.invoiceDate}</td><td>${data.orderReference}</td><td>${data.orderDate}</td>
              </tr>
            </table>
            
            <table class="items">
              <thead>
                <tr>
                  <th>Référence</th><th>Produit</th><th>Taux<br>de taxe</th><th>Remise<br>%</th>
                  <th>Prix unitaire<br>(HT)</th><th>Remise</th><th>Qté</th><th>Total<br>(HT)</th>
                </tr>
              </thead>
              <tbody>
                ${products}
              </tbody>
            </table>
            
            <div class="bottom">
              <div class="left">
                <table class="box taxes">
                  <tr><th>Détail des taxes</th><th>Taux de taxe</th><th>Total Taxes</th></tr>
                  <tr><td>Produits</td><td>${data.tax_details.product_tax_rate} %</td><td>${data.tax_details.total_product_tax}</td></tr>
                  <tr><td>Livraison</td><td>${data.tax_details.shipping_tax_rate} %</td><td>${data.tax_details.shipping_tax}</td></tr>
                </table>
                <table class="pay">
                  <tr><td>Moyen de paiement</td><td>${data.payment} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${data.totals.totalTTC}</td></tr>
                  <tr><td>Transporteur</td><td>${data.carrier_name}</td></tr>
                </table>
              </div>
            
              <table class="box totals">
                <tr><td>Total produits</td><td>${data.totals.products}</td></tr>
                <tr><td>Frais d'expédition</td><td>${data.totals.shippingHT}</td></tr>
                <tr><td>Total (HT)</td><td>${data.totals.totalHT}</td></tr>
                <tr><td>Total Taxes</td><td>${data.totals.taxTotal}</td></tr>
                <tr class="grand"><td>Total</td><td>${data.totals.totalTTC}</td></tr>
              </table>
            </div>
            
            </body>
          </html>`;
}

//recuperation des donnees de facturations via mail ou refererence de commande
async function getInvoice(reference, email, apiUrl = apiUrlLclp, boutique = "Lclp", baseUrl = process.env.BASE_URL_APP){
  try { 

    const order_id = (reference && (await getOrderByReferenceNum(apiUrl, reference))) || (await getLatestOrderIdByEmail(email, apiUrl));

    // data de facture (order_invoices)
    const invoiceData = await getOrderInvoiceById(order_id, apiUrl);
    // data de l'order (orders)
    const order = await getOrderById(apiUrl, order_id);

    // data custommer
    let customer = await getCustomerById(apiUrl, order.id_customer);

    if(customer.email != email){
      return { "message ": "L’adresse e-mail fournie ne correspond pas à celle associée à la commande." };
    }

    // data detail_order
    const orderDetails = await getOrderDetails(apiUrl, order_id);
    // address livraison
    const deliveryAddress = await getAddress(order.id_address_delivery, apiUrl);
    // address invoice
    const invoiceAddress = await getAddress(order.id_address_invoice, apiUrl);
    // tracking
    const tracking = await getTracking(apiUrl, order_id);
    
    // data arrangement 
    const products = orderDetails.map((d) => ({
      reference: d.product_reference,
      name: d.product_name,
      qty: Number(d.product_quantity),
      unitHT: Number(d.unit_price_tax_excl).toFixed(2) + " €",
      totalHT: Number(d.total_price_tax_excl) + " €",
      discountPct: Number(d.reduction_percent),
      taxRate: Math.round((d.unit_price_tax_incl / d.unit_price_tax_excl - 1) * 100),
    }));

    const facture = {
      invoiceNumber: "#P" + invoiceData[0].number,
      invoiceDate: invoiceData[0].date_add,
      orderReference: order.reference,
      orderDate: order.date_add,
      delivery_address: {
        customer_name: deliveryAddress[0].firstname + " " + deliveryAddress[0].lastname,
        company: deliveryAddress[0].company,
        address1: deliveryAddress[0].address1,
        address2: deliveryAddress[0].address2,
        codePostal: deliveryAddress[0].postcode + " " + deliveryAddress[0].city,
        country: await getCountryName(deliveryAddress[0].id_country, apiUrl),
        phone: deliveryAddress[0].phone,
        phone_mobile: deliveryAddress[0].phone_mobile,
      },
      billing_address: {
        customer_name: invoiceAddress[0].firstname + " " + invoiceAddress[0].lastname,
        company: invoiceAddress[0].company,
        address1: invoiceAddress[0].address1,
        address2: invoiceAddress[0].address2,
        codePostal: invoiceAddress[0].postcode + " " + invoiceAddress[0].city,
        country: await getCountryName(invoiceAddress[0].id_country, apiUrl),
        phone: invoiceAddress[0].phone,
        phone_mobile: invoiceAddress[0].phone_mobile,
      },
      carrier_name: tracking.tracks[0].carrier_name,
      payment: order.payment,
      products,
      tax_details : {
        product_tax_rate: ((((invoiceData[0].total_paid_tax_incl - invoiceData[0].total_paid_tax_excl) - (invoiceData[0].total_shipping_tax_incl - invoiceData[0].total_shipping_tax_excl))*100) / invoiceData[0].total_products).toFixed(0),
        total_product_tax: ((invoiceData[0].total_paid_tax_incl - invoiceData[0].total_paid_tax_excl) - (invoiceData[0].total_shipping_tax_incl - invoiceData[0].total_shipping_tax_excl)).toFixed(2) + " €",
        shipping_tax_rate: Number(order.carrier_tax_rate).toFixed(0),
        shipping_tax: +(invoiceData[0].total_shipping_tax_incl - invoiceData[0].total_shipping_tax_excl).toFixed(2) + " €",
      },
      totals: {
        products: Number(invoiceData[0].total_products) + " €",
        shippingHT: Number(invoiceData[0].total_shipping_tax_excl) + " €",
        totalHT: Number(invoiceData[0].total_paid_tax_excl) + " €",
        totalTTC: Number(invoiceData[0].total_paid_tax_incl) + " €",
        taxProducts: +(invoiceData[0].total_products_wt - invoiceData[0].total_products).toFixed(2) + " €",
        taxShipping: +(invoiceData[0].total_shipping_tax_incl - invoiceData[0].total_shipping_tax_excl).toFixed(2) + " €",
        taxTotal: +(invoiceData[0].total_paid_tax_incl - invoiceData[0].total_paid_tax_excl).toFixed(2) + " €",
      }
    };
    
    const html = await createHtmlInvoice(facture);

    //Translate HTML
    //const openai = new OpenAiApiService();
    //const html_translated = await openai.translate(html, {target: langue});

    const html_translated = html;

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
    const filename = `${order.reference}.pdf`;
    const outputPath = path.join(__dirname, "../public/uploads/invoices", filename);

    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, protectedPdf);

    const finalUrl = `${baseUrl}/public/uploads/invoices/${encodeURIComponent(filename)}`;

    // Retourner infos
    return {
        invoice_link: finalUrl
    };

  } catch (error) {
    console.error("Erreur:", error.message);
    return { "message ": error.message };
  }
}

module.exports = { getOrderByReference, getOrdersByEmail, getOrderByRefOrByEmail, getInvoice };