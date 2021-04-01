import { Config } from "../typings"
import binanceConfig from "./config.binance"
import { Platform } from "./platform"

const platform = process.env.PLATFORM ?? Platform.BINANCE

export const config: Config =
  platform === Platform.BINANCE ? binanceConfig : null
