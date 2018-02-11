import Trader from '../trader/index';
import { debug } from 'util';

const SlackWebhook = require('slack-webhook')
 
const slack = new SlackWebhook('https://hooks.slack.com/services/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', {
  defaults: {
    username: 'Bot',
    channel: '#trades',
    icon_emoji: ':robot_face:'
  }
})

class Slack{

  // static BuyMessage(trade: Trade, currency: string){
  //   slack.send({
  //     text: `I have buyed ${trade.quantity} ${currency} at ${trade.price}`,
  //     username: 'Theddy The Ruin',
  //     icon_emoji: ':scream_cat:'
  //   })
  // }

    static BuyMessage(trader: Trader){
    slack.send({
      text: `I have buyed ${trader.lastBuyTrade.quantity} ${trader.baseCurrency} at ${trader.lastBuyTrade.price} ${trader.quoteCurrency}`,
      username: 'Theddy The Ruin',
      icon_emoji: ':scream_cat:'
    })
  }


  static SellMessage(trader: Trader){
    slack.send({
      text: `I have selled  ${trader.lastBuyTrade.quantity} ${trader.baseCurrency} at ${trader.lastBuyTrade.price} ${trader.quoteCurrency} - Benefits : ${trader.lastSellTrade.benefits}`,
      username: 'Theddy The Ruin',
      icon_emoji: ':scream_cat:'
    })
  }



}

export default Slack