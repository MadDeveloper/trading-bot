import { config } from "./config"
import { Platform } from "./config/platform"
import BinanceMarket from "./markets/binance"
import GdaxMarket from "./markets/gdax"
import "./rxjs.extensions"
import Market from "./vendor/interfaces/market"
import Trader from "./vendor/trader/index"

async function start() {
  // Load market
  if (!Object.values(Platform).includes(config.app.platform)) {
    throw new Error(`Invalid market platform: ${config.app.platform}`)
  }

  const market: Market =
    config.app.platform === Platform.BINANCE
      ? new BinanceMarket()
      : new GdaxMarket()

  await market.init()

  // Make trader trade
  const trader = new Trader(market)

  trader.trade()
}

start()
