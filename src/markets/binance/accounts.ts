import { Binance } from "binance-api-node"
import { Currency } from "../../vendor/interfaces/currency.enum"
import { Accounts } from "../../vendor/market/accounts"

class BinanceAccounts implements Accounts {
  client: Binance

  constructor(client: Binance) {
    this.client = client
  }

  async availableFunds(currency: Currency): Promise<number> {
    const { balances } = await this.client.accountInfo()
    const currencyBalance = balances.find(
      (balance) => balance.asset === currency
    )

    if (!currencyBalance) {
      throw new Error(`Currency ${currency} was not found in the balances`)
    }

    return parseFloat(currencyBalance.free)
  }
}

export default BinanceAccounts
