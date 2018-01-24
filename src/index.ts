import './rxjs.extensions'
import Trader from './vendor/trader/index';
import GdaxMarket from './markets/gdax';
import config from './config';
import { writeFileSync } from 'fs'

// Markets
const gdax = new GdaxMarket()

gdax.sandbox = false
gdax.init()

// Traders
const bot = new Trader(gdax)

bot.trade()
