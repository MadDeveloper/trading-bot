import './rxjs.extensions'
import Trader from './vendor/trader/index';
import {  config } from './config';
import { Platform } from './config/platform';
import Market from './vendor/interfaces/market';
import Slack from './vendor/slack/index';

async function start() {
    // Load market
    const market: Market = new (require(`./markets/${config.app.platform}`).default)()

    await market.init()

    // Make trader trade
    const trader = new Trader(market)

    trader.trade()
}

start()