require('dotenv').config();
const axios = require('axios');
const https = require('https');
const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const path = require("path");

// ============================================================
// Configuration multi-boutique
// ============================================================
// L'ordre du tableau = ordre de priorité si une référence existait dans
// plusieurs boutiques. Une clé API propre à chaque boutique est utilisée si
// elle est définie (PRESTASHOP_<KEY>_API_KEY), sinon on retombe sur
// PRESTASHOP_API_KEY (comportement actuel).
const DEFAULT_API_KEY = process.env.PRESTASHOP_API_KEY;

const SHOPS = [
  {
    key: "digiparf",
    name: "Digiparf",
    apiUrl: `${process.env.PRESTASHOP_DIGIPARF_URL}/api/`,
    apiKey: process.env.PRESTASHOP_DIGIPARF_API_KEY || DEFAULT_API_KEY,
    // En-tête de facture (à compléter)
    invoice: { logo: "Digiparf", addressLines: ["17 Route des Boulangers", "79 530 BUC", "France", "01 85 36 00 78"] },
  },
  {
    key: "helfrich",
    name: "Helfrich",
    apiUrl: `${process.env.PRESTASHOP_HELFRICH_URL}/api/`,
    apiKey: process.env.PRESTASHOP_HELFRICH_API_KEY || DEFAULT_API_KEY,
    invoice: { logo: "Helfrich", addressLines: ["17 Route des Boulangers", "79 530 BUC", "France", "01 85 36 00 78"] },
  },
  {
    key: "universce",
    name: "Universce",
    apiUrl: `${process.env.PRESTASHOP_UNIVERSCSE_URL}/api/`,
    apiKey: process.env.PRESTASHOP_UNIVERSCSE_API_KEY || DEFAULT_API_KEY,
    invoice: { logo: "Universce", addressLines: ["17 Route des Boulangers", "79 530 BUC", "France", "01 85 36 00 78"] },
  },
  // Pour inclure les autres boutiques dans la recherche client :
  // { key: "ambitioncse", name: "Ambitioncse", apiUrl: `${process.env.PRESTASHOP_AMBITIONCSE_URL}/api/`, apiKey: ..., invoice: {...} },
  // { key: "clubulys",    name: "Clubulys",    apiUrl: `${process.env.PRESTASHOP_CLUBULYS_URL}/api/`,    apiKey: ..., invoice: {...} },
  // { key: "reducce",     name: "Reducce",     apiUrl: `${process.env.PRESTASHOP_REDUCCE_URL}/api/`,     apiKey: ..., invoice: {...} },
];

const DEFAULT_PAGE_SIZE = 1;
const MAX_PAGE_SIZE = 10;
function normalizeLimit(limit) {
  const n = parseInt(limit, 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
}

const EMAIL_MISMATCH_MESSAGE = "L’adresse e-mail fournie ne correspond pas à celle associée à la commande.";

const TRACKING_URLS = {
  colissimo: (n) => `https://www.laposte.fr/outils/suivre-vos-envois?code=${encodeURIComponent(n)}`,
  chronopost: (n) => `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${encodeURIComponent(n)}`,
  mondialrelay: (n) => `https://www.mondialrelay.fr/suivi-de-colis?numeroExpedition=${encodeURIComponent(n)}`,
};

function buildTrackingUrl(carrier, track_number) {
  const code = (carrier?.external_module_name || "").toLowerCase();
  const key = Object.keys(TRACKING_URLS).find((k) => code.includes(k));
  return key ? TRACKING_URLS[key](track_number) : null;
}

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const sameEmail = (a, b) =>
  !!a && !!b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

// ============================================================
// Appel générique PrestaShop (par boutique)
// ============================================================
async function callPrestaShopAPI(shop, pathAndQuery) {
  const url = `${shop.apiUrl}${pathAndQuery}`;
  try {
    console.log(url);
    const response = await axios.get(url, {
      auth: { username: shop.apiKey, password: "" },
      timeout: 30000,
      httpsAgent,
    });
    return response.data;
  } catch (error) {
    console.log(error.message);
    if (error.response) {
      throw new Error(`Erreur HTTP [${shop.name}]: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw new Error(`Erreur Axios [${shop.name}]: ${error.message}`);
  }
}

// ============================================================
// Accès unitaires
// ============================================================
async function getOrderById(shop, order_id) {
  const data = await callPrestaShopAPI(shop, `orders/${order_id}?output_format=JSON`);
  return data.order ?? null;
}

async function getCustomerById(shop, customerId) {
  const data = await callPrestaShopAPI(shop, `customers/${customerId}?output_format=JSON`);
  return data.customer ?? null;
}

async function getOrderStateById(shop, stateId) {
  const data = await callPrestaShopAPI(shop, `order_states/${stateId}?output_format=JSON`);
  return data.order_state ?? null;
}

async function getOrderDetails(shop, order_id) {
  const data = await callPrestaShopAPI(shop, `order_details?filter[id_order]=${order_id}&display=full&output_format=JSON`);
  return data.order_details ?? [];
}

async function getOrderPayementDetail(shop, order_payment_id) {
  const data = await callPrestaShopAPI(shop, `order_payments/${order_payment_id}?output_format=JSON`);
  return data.order_payment ?? [];
}

async function getOrderPayement(shop, order_reference) {
  const data = await callPrestaShopAPI(
    shop,
    `order_payments?filter[order_reference]=${encodeURIComponent(order_reference)}&output_format=JSON`
  );
  const payments = data.order_payments ?? [];
  // (correctif : l'ancienne boucle relisait toujours payments[0])
  return Promise.all(payments.map((p) => getOrderPayementDetail(shop, p.id)));
}

async function getTracking(shop, orderId) {
  const data = await callPrestaShopAPI(shop, `order_carriers?filter[id_order]=${orderId}&display=full&output_format=JSON`);
  const orderCarriers = data.order_carriers ?? [];

  const tracks = [];
  for (const oc of orderCarriers) {
    if (oc.id_carrier) {
      // (correctif : "?" manquant avant output_format dans l'ancienne URL)
      const data2 = await callPrestaShopAPI(shop, `carriers/${oc.id_carrier}?output_format=JSON`);
      const carrier = data2.carrier;

      tracks.push({
        id_carrier: oc.id_carrier,
        carrier_name: carrier?.name || null,
        tracking_number: oc.tracking_number,
        tracking_url: oc.tracking_number ? buildTrackingUrl(carrier, oc.tracking_number) : null,
      });
    } else {
      tracks.push({ id_carrier: null, carrier_name: null, tracking_number: null, tracking_url: null });
    }
  }
  return { tracks };
}

// ============================================================
// Recherche : par référence (toutes boutiques) / par email (toutes boutiques)
// ============================================================
async function getOrderIdByReference(shop, reference) {
  const data = await callPrestaShopAPI(shop, `orders?filter[reference]=${encodeURIComponent(reference)}&output_format=JSON`);
  return data?.orders?.[0]?.id ?? null;
}

// Cherche la référence dans toutes les boutiques en parallèle.
// Retourne { shop, orderId } ou null.
async function findOrderByReference(reference) {
  const results = await Promise.allSettled(
    SHOPS.map(async (shop) => ({ shop, orderId: await getOrderIdByReference(shop, reference) }))
  );

  results.forEach((r, i) => {
    if (r.status === "rejected") console.error(`Recherche référence en erreur sur ${SHOPS[i].name}:`, r.reason?.message);
  });

  // on respecte l'ordre de SHOPS
  const hit = results.find((r) => r.status === "fulfilled" && r.value.orderId);
  return hit ? hit.value : null;
}

// Un même email peut avoir plusieurs "customers" (compte + invité) dans une boutique
async function getCustomerIdsByEmail(shop, email) {
  const data = await callPrestaShopAPI(shop, `customers?filter[email]=${encodeURIComponent(email)}&output_format=JSON`);
  return (data.customers || []).map((c) => c.id);
}

async function getOrdersByCustomerIds(shop, customerIds, limit = DEFAULT_PAGE_SIZE) {
  const ids = customerIds.join("|");
  const data = await callPrestaShopAPI(
    shop,
    `orders?filter[id_customer]=[${ids}]` +
      `&sort=id_DESC&limit=0,${limit}` +
      `&display=[id,reference,total_paid,current_state,date_add]` +
      `&output_format=JSON`
  );
  return data.orders || [];
}

// Dernière commande du client dans CHAQUE boutique, puis la plus récente de toutes.
// Retourne { shop, orderId, orderRef, date } ou null.
async function findLatestOrderByEmail(email) {
  const pageSize = normalizeLimit(1);

  const results = await Promise.allSettled(
    SHOPS.map(async (shop) => {
      const customerIds = await getCustomerIdsByEmail(shop, email);
      if (!customerIds.length) return null;
      const orders = await getOrdersByCustomerIds(shop, customerIds, pageSize);
      if (!orders.length) return null;
      const last = orders.reduce((a, b) => (Number(b.id) > Number(a.id) ? b : a));
      return { shop, orderId: last.id, orderRef: last.reference, date: last.date_add };
    })
  );

  results.forEach((r, i) => {
    if (r.status === "rejected") console.error(`Recherche email en erreur sur ${SHOPS[i].name}:`, r.reason?.message);
  });

  const candidates = results.filter((r) => r.status === "fulfilled" && r.value).map((r) => r.value);
  if (!candidates.length) return null;

  return candidates.reduce((a, b) => (new Date(b.date) > new Date(a.date) ? b : a));
}

// Référence d'abord, repli sur l'email si introuvable.
async function resolveOrderTarget(reference, email) {
  if (reference) {
    const found = await findOrderByReference(reference);
    if (found) return { ...found, by: "order_number" };
    console.log("switch to email searching : commande introuvable par référence");
  }

  if (!email) throw new Error("Commande non trouvée et aucun email fourni pour la recherche");

  const found = await findLatestOrderByEmail(email);
  if (!found) throw new Error(`Aucune commande trouvée pour l'email "${email}"`);
  return { shop: found.shop, orderId: found.orderId, by: "email" };
}

// ============================================================
// Récupération complète des informations d'une commande
// ============================================================
class EmailMismatchError extends Error {}

async function buildOrderPayload(shop, order_id, by, email) {
  const order = await getOrderById(shop, order_id);
  if (!order) throw new Error("Commande non trouvée ou erreur lors de la récupération");

  const customer = order.id_customer ? await getCustomerById(shop, order.id_customer) : null;

  // Une commande retrouvée par référence doit appartenir à l'email fourni
  if (by === "order_number" && !sameEmail(customer?.email, email)) {
    throw new EmailMismatchError(EMAIL_MISMATCH_MESSAGE);
  }

  const [orderState, orderDetails, transaction_details, tracking] = await Promise.all([
    order.current_state ? getOrderStateById(shop, order.current_state) : null,
    getOrderDetails(shop, order_id),
    getOrderPayement(shop, order.reference),
    getTracking(shop, order_id),
  ]);

  return {
    by,
    boutique: shop.name,
    order,
    customer,
    orderState,
    orderDetails,
    transaction_details,
    tracking,
  };
}

// ---------- FONCTION PRINCIPALE 1 ----------
async function getOrderByRefOrByEmail(reference, email) {
  try {
    const target = await resolveOrderTarget(reference, email);
    return await buildOrderPayload(target.shop, target.orderId, target.by, email);
  } catch (error) {
    console.error("Erreur:", error.message);
    return { message: error.message };
  }
}

// ============================================================
// Facture
// ============================================================
const esc = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const lines = (arr) => arr.filter((x) => x && String(x).trim()).map(esc).join("<br>");

async function getAddress(shop, address_id) {
  const data = await callPrestaShopAPI(shop, `addresses?filter[id]=${address_id}&display=full&output_format=JSON`);
  return data.addresses ?? null;
}

async function getCountryName(shop, country_id) {
  const data = await callPrestaShopAPI(shop, `countries?filter[id]=${country_id}&display=full&output_format=JSON`);
  return data.countries?.[0]?.name?.[0]?.value ?? null;
}

async function getOrderInvoiceById(shop, order_id) {
  const data = await callPrestaShopAPI(shop, `order_invoices?filter[id_order]=${order_id}&display=full&output_format=JSON`);
  return data.order_invoices ?? null;
}

function createHtmlInvoice(shop, data) {
  const products = data.products
    .map(
      (p) => `<tr>
                <td>${esc(p.reference)}</td>
                <td>${esc(p.name)}</td>
                <td>${esc(p.taxRate)} %</td><td>${esc(p.discountPct)}</td><td>${esc(p.unitHT)}</td><td>${esc(p.discountPrice)}</td><td>${esc(p.qty)}</td><td>${esc(p.totalHT)}</td>
              </tr>`
    )
    .join("");

  const addrBlock = (a) =>
    lines([a.customer_name, a.company, a.address1, a.address2, a.codePostal, a.country, a.phone, a.phone_mobile]);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Facture ${esc(data.invoiceNumber)}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; }
  body { font-family: "DejaVu Sans", Arial, sans-serif; font-size: 13px; color: #222; margin: 0; padding: 24px; max-width: 780px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; }
  .logo { font-size: 26px; font-weight: bold; }
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
  <div class="logo">${esc(shop.invoice.logo)}</div>
  <div class="title">FACTURE<br><span class="sub">${esc(data.invoiceDate)}<br>${esc(data.invoiceNumber)}</span></div>
</div>

<div class="addresses">
  <div class="shop">${lines(shop.invoice.addressLines)}</div>
  <div><h4>Adresse de livraison</h4>${addrBlock(data.delivery_address)}</div>
  <div><h4>Adresse de facturation</h4>${addrBlock(data.billing_address)}</div>
</div>

<table class="meta">
  <tr><th>Numéro de facture</th><th>Date de facturation</th><th>Réf. de commande</th><th>Date de commande</th></tr>
  <tr><td>${esc(data.invoiceNumber)}</td><td>${esc(data.invoiceDate)}</td><td>${esc(data.orderReference)}</td><td>${esc(data.orderDate)}</td></tr>
</table>

<table class="items">
  <thead>
    <tr>
      <th>Référence</th><th>Produit</th><th>Taux<br>de taxe</th><th>Remise<br>%</th>
      <th>Prix unitaire<br>(HT)</th><th>Remise</th><th>Qté</th><th>Total<br>(HT)</th>
    </tr>
  </thead>
  <tbody>${products}</tbody>
</table>

<div class="bottom">
  <div class="left">
    <table class="box taxes">
      <tr><th>Détail des taxes</th><th>Taux de taxe</th><th>Total Taxes</th></tr>
      <tr><td>Produits</td><td>${esc(data.tax_details.product_tax_rate)} %</td><td>${esc(data.tax_details.total_product_tax)}</td></tr>
      <tr><td>Livraison</td><td>${esc(data.tax_details.shipping_tax_rate)} %</td><td>${esc(data.tax_details.shipping_tax)}</td></tr>
    </table>
    <table class="pay">
      <tr><td>Moyen de paiement</td><td>${esc(data.payment)} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${esc(data.totals.totalTTC)}</td></tr>
      <tr><td>Transporteur</td><td>${esc(data.carrier_name)}</td></tr>
    </table>
  </div>

  <table class="box totals">
    <tr><td>Total produits</td><td>${esc(data.totals.products)}</td></tr>
    <tr><td>Frais d'expédition</td><td>${esc(data.totals.shippingHT)}</td></tr>
    <tr><td>Total (HT)</td><td>${esc(data.totals.totalHT)}</td></tr>
    <tr><td>Total Taxes</td><td>${esc(data.totals.taxTotal)}</td></tr>
    <tr><td>Remise (TTC)</td><td>${esc(data.totals.total_discounts_tax_incl)}</td></tr>
    <tr class="grand"><td>Total</td><td>${esc(data.totals.totalTTC)}</td></tr>
  </table>
</div>

</body>
</html>`;
}

// ---------- FONCTION PRINCIPALE 2 ----------
async function getInvoice(reference, email, baseUrl = process.env.BASE_URL_APP) {
  let browser;
  try {
    const { shop, orderId: order_id, by } = await resolveOrderTarget(reference, email);

    const order = await getOrderById(shop, order_id);
    if (!order) throw new Error("Commande non trouvée ou erreur lors de la récupération");

    const customer = await getCustomerById(shop, order.id_customer);
    if (!sameEmail(customer?.email, email)) {
      return { message: EMAIL_MISMATCH_MESSAGE };
    }

    const invoiceData = await getOrderInvoiceById(shop, order_id);
    if (!invoiceData?.length) {
      return { message: "Aucune facture n'est disponible pour cette commande pour le moment." };
    }
    const inv = invoiceData[0];

    const [orderDetails, deliveryAddress, invoiceAddress, tracking] = await Promise.all([
      getOrderDetails(shop, order_id),
      getAddress(shop, order.id_address_delivery),
      getAddress(shop, order.id_address_invoice),
      getTracking(shop, order_id),
    ]);

    const [deliveryCountry, invoiceCountry] = await Promise.all([
      getCountryName(shop, deliveryAddress[0].id_country),
      getCountryName(shop, invoiceAddress[0].id_country),
    ]);

    const products = orderDetails.map((d) => ({
      reference: d.product_reference,
      name: d.product_name,
      qty: Number(d.product_quantity),
      unitHT: Number(d.unit_price_tax_excl).toFixed(2) + " €",
      totalHT: Number(d.total_price_tax_excl) + " €",
      discountPct: Number(d.reduction_percent),
      discountPrice: ((Number(d.unit_price_tax_excl) * Number(d.reduction_percent)) / 100).toFixed(2) + " €",
      taxRate: Math.round((d.unit_price_tax_incl / d.unit_price_tax_excl - 1) * 100),
    }));

    const toAddress = (a, country) => ({
      customer_name: a.firstname + " " + a.lastname,
      company: a.company,
      address1: a.address1,
      address2: a.address2,
      codePostal: a.postcode + " " + a.city,
      country,
      phone: a.phone,
      phone_mobile: a.phone_mobile,
    });

    const productTax =
      inv.total_paid_tax_incl - inv.total_paid_tax_excl - (inv.total_shipping_tax_incl - inv.total_shipping_tax_excl);

    const facture = {
      invoiceNumber: "#P" + inv.number,
      invoiceDate: inv.date_add,
      orderReference: order.reference,
      orderDate: order.date_add,
      delivery_address: toAddress(deliveryAddress[0], deliveryCountry),
      billing_address: toAddress(invoiceAddress[0], invoiceCountry),
      carrier_name: tracking.tracks[0]?.carrier_name ?? "",
      payment: order.payment,
      products,
      tax_details: {
        product_tax_rate: ((productTax * 100) / inv.total_products).toFixed(0),
        total_product_tax: productTax.toFixed(2) + " €",
        shipping_tax_rate: Number(order.carrier_tax_rate).toFixed(0),
        shipping_tax: +(inv.total_shipping_tax_incl - inv.total_shipping_tax_excl).toFixed(2) + " €",
      },
      totals: {
        products: Number(inv.total_products) + " €",
        shippingHT: Number(inv.total_shipping_tax_excl) + " €",
        totalHT: Number(inv.total_paid_tax_excl) + " €",
        totalTTC: Number(inv.total_paid_tax_incl) + " €",
        total_discounts_tax_incl: "- " + Number(order.total_discounts_tax_incl) + " €",
        taxTotal: +(inv.total_paid_tax_incl - inv.total_paid_tax_excl).toFixed(2) + " €",
      },
    };

    const html = createHtmlInvoice(shop, facture);

    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });

    // Préfixe boutique : deux boutiques peuvent avoir la même référence
    const filename = `${shop.key}_${order.reference}.pdf`;
    const outputPath = path.join(__dirname, "../public/uploads/invoices", filename);
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, pdfBuffer);

    return {
      boutique: shop.name,
      invoice_link: `${baseUrl}/public/uploads/invoices/${encodeURIComponent(filename)}`,
    };
  } catch (error) {
    console.error("Erreur:", error.message);
    return { message: error.message };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

module.exports = { getOrderByRefOrByEmail, getInvoice, SHOPS };