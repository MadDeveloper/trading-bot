import './rxjs.extensions'
import Trader from './vendor/trader/index';
import GdaxMarket from './markets/gdax';
import config from './config';
import { writeFileSync } from 'fs'
import Logger from './vendor/logger/index';

const market = new GdaxMarket()

market.sandbox = config.api.sandbox
market.init()

const trader = new Trader(market)

trader.trade()