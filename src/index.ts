import './rxjs.extensions'
import Trader from './vendor/trader/index';
import GdaxMarket from './markets/gdax';
import config from './config';

// Markets
const gdax = new GdaxMarket()

gdax.sandbox = true
gdax.init()

// Traders
const bot = new Trader(gdax)

bot.trade()
