import { Config } from "../typings";
import { Platform } from './platform';

const platform = Platform.BINANCE

export const config: Config = require(`./config.${platform}`).default