import { config } from "./config"
import { Platform } from "./config/platform"
import BinanceMarket from "./markets/binance"
import "./rxjs.extensions"
import Trader from "./vendor/trader/index"

async function start() {
  // Load market
  if (!Object.values(Platform).includes(config.app.platform)) {
    throw new Error(`Invalid market platform: ${config.app.platform}`)
  }

  const market = new BinanceMarket()

  await market.init()

  // Make trader trade
  const trader = new Trader(market)

  trader.trade()
}

start()
