require('dotenv').config();

const Shopify = require('shopify-api-node');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const isBetween = require('dayjs/plugin/isBetween');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);


class Disburse {

  shopify = new Shopify({
    shopName: process.env.SHOPIFY_SHOP_NAME,
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN
  });


  constructor(date, hour){
    this.date = date;
    this.hour = hour;
    this.log = createCustomLogger(`../public/accountant/log/${dayjs(this.date).format('YYYYMMDD')}H${this.hour + 1}.log`);
  }

  // call paid order (add filter of paid order here)
  async getAllOrdersByHour(date, hour) {
    const now = dayjs().tz('Europe/Paris');
    const start = now.subtract(1, 'day').minute(0).second(0); // recule de 25h 
    const end = now.add(5, 'hour').minute(59).second(59); // plus 2h pour la fin

    //pour 2025-01-25 a 7h
    //on prend les transactions paid du 2025-01-24 7h00 jusqu'a 2025-01-25 8h59 // on aura une grande plage car l'appel de shopify bug un coup
    this.log.info(`shopify_start : ${start.toISOString()} | shopify_end : ${end.toISOString()} `);

    let allOrders = [];
    let params = {
      created_at_min: start.toISOString(),
      created_at_max: end.toISOString(),
      status: 'any',
      financial_status: 'paid',
      limit: 250,
      order: 'created_at asc'
    };

    let hasNextPage = true;

    while (hasNextPage) {
      const orders = await this.shopify.order.list(params);
      allOrders.push(order);
      
      // Vérifie s’il reste une page
      hasNextPage = orders.length === 250;

      if (hasNextPage) {
        const lastOrder = orders[orders.length - 1];
        // Prochaine requête commencera juste après la dernière commande
        params.created_at_min = dayjs(lastOrder.created_at).add(1, 'second').toISOString();
      }
    }
    return allOrders;
  }

}
