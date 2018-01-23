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

// process.once('SIGTERM', () => writeDebug)
// process.once('SIGINT', writeDebug)

function writeDebug() {
    const debug = bot.getDebug()

    console.log('Writing debug...')
    writeFileSync('./data.json', JSON.stringify(debug, null, 2), { encoding: 'utf-8' })
    console.log('Debug written correctly, process will now ends.')
}