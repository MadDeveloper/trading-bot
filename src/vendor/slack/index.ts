import * as SlackWebhook from 'slack-webhook';
import Trader from '../trader/index';

class Slack {
    private trader: Trader
    private webhook: SlackWebhook

    constructor(trader: Trader) {
        this.webhook = new SlackWebhook('https://hooks.slack.com/services/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', {
            defaults: {
                username: 'Bot',
                channel: '#trades',
                icon_emoji: ':robot_face:'
            }
        })
        this.trader = trader
    }

    buyMessage() {
        this.webhook.send({
            text: `I bought ${this.trader.lastBuyTrade.quantity} ${this.trader.baseCurrency} at ${this.trader.lastBuyTrade.price} ${this.trader.quoteCurrency}`,
            username: 'Theddy The Ruin',
            icon_emoji: ':scream_cat:'
        })
    }

    sellMessage() {
        this.webhook.send({
            text: `I sold ${(this.trader.lastSellTrade.quantity * this.trader.lastSellTrade.price)} ${this.trader.baseCurrency} at ${this.trader.lastSellTrade.price} ${this.trader.quoteCurrency} - Benefits: ${this.trader.lastSellTrade.benefits}%`,
            username: 'Theddy The Ruin',
            icon_emoji: ':scream_cat:'
        })
    }
}

export default Slack