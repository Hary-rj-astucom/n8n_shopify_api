const axios = require("axios");

class ShippingboApiService {
  constructor() {

    this.clientId = "-vzedQkPQ7Gl0_88Os83duVEQFQLV57xn0QpYiRQirQ";
    this.clientSecret = "SbXZHSl_IvtBIASKpR_ayGVexhm7qYSFMd-zQdHZxQs";
    this.redirectUri = "/shippingbo/callback";

    this.authUrl = "https://oauth.shippingbo.com/oauth/authorize";
    this.tokenUrl = "https://oauth.shippingbo.com/oauth/token";
    this.apiUrl = "https://api.shippingbo.com/v1";

    this.accessToken = null;
    this.refreshToken = null;
  }

  /**
   * Étape 1 : Générer l’URL d’authentification
   */
  getAuthUrl(scope = "read write") {
    return `${this.authUrl}?response_type=code&client_id=${
      this.clientId
    }&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=${scope}`;
  }

  // 2️⃣ Callback OAuth
  async callback (code){

    if (!code) {
      return res.status(400).send("❌ Aucun code reçu dans la redirection.");
    }

    try {
      const tokenData = await this.getAccessToken(code);
      console.dir("token access generate : ", tokenData);

    } catch (error) {
      res.status(500).send("❌ Erreur lors du callback OAuth");
    }
  }

  /**
   * Étape 2 : Échanger un code contre un token
   */
  async getAccessToken(authCode) {
    try {
      const response = await axios.post(
        this.tokenUrl,
        {
          grant_type: "authorization_code",
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
          code: authCode,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Étape 3 : Rafraîchir le token si expiré
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error("⚠️ Aucun refresh_token disponible");
    }

    try {
      const response = await axios.post(
        this.tokenUrl,
        {
          grant_type: "refresh_token",
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: this.refreshToken,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Méthode générique pour appeler l’API Shippingbo
   */
  async request(endpoint, method = "GET", data = null) {
    if (!this.accessToken) {
      throw new Error("⚠️ Pas de token. Appelez getAccessToken() d'abord.");
    }

    try {
      const response = await axios({
        method,
        url: `${this.apiUrl}${endpoint}`,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/json",
        },
        data,
      });

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Exemple : récupérer une commande par référence
   */
  async getOrderByReference(reference) {
    return this.request(`/orders?reference=${encodeURIComponent(reference)}`);
  }

  /**
   * Exemple : récupérer une commande par ID
   */
  async getOrderById(orderId) {
    return this.request(`/orders/${orderId}`);
  }

  /**
   * Gestion des erreurs API
   */
  handleError(error) {
    if (error.response) {
      console.error("❌ API error:", error.response.data);
      throw error;
    } else {
      console.error("❌ Request error:", error.message);
      throw error;
    }
  }
}

module.exports = ShippingboApiService;
