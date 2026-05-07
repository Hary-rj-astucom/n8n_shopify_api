const PrestaShopApiService = require('../services/PrestashopApiService');

// ── Calcul automatique des dates ──────────────────────────────────────────
const aujourd_hui        = new Date();

const debutMoisActuel    = new Date(aujourd_hui.getFullYear(), aujourd_hui.getMonth(), 1);
const debutMoisDernier   = new Date(aujourd_hui.getFullYear(), aujourd_hui.getMonth() - 1, 1);

// ── Format YYYY-MM-DD pour PrestaShop ─────────────────────────────────────
const fmt = (date) => {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day   = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

console.log("Api date range:", fmt(debutMoisDernier), fmt(debutMoisActuel));

//avoir les commandes prestashop et faire la commande
PrestaShopApiService.extractOrderDigiparfRepport(fmt(debutMoisDernier), fmt(debutMoisActuel));

