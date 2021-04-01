import { Config } from "../typings"
import binanceConfig from "./config.binance"
import gdaxConfig from "./config.gdax"
import { Platform } from "./platform"

const platform = process.env.PLATFORM ?? Platform.BINANCE

export const config: Config =
  platform === Platform.BINANCE
    ? binanceConfig
    : platform === Platform.GDAX
    ? gdaxConfig
    : null
