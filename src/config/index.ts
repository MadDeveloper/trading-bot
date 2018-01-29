import { Config } from "../typings";
import { Platform } from './platform';

const platform = Platform.GDAX

export const config: Config = require(`./config.${platform}`).default