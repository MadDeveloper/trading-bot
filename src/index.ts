import './rxjs.extensions'
import Trader from './vendor/trader/index';
import GdaxMarket from './markets/gdax';

const trader = new Trader(new GdaxMarket())

trader.trade()