import { config } from "../../config"

class Logger {
  static debug(message) {
    if (config.app.debug) {
      console.log(message)
    }
  }

  static error(message) {
    console.error(message)
  }

  static warn(message) {
    console.warn(message)
  }

  static info(message) {
    console.info(message)
  }
}

export default Logger
