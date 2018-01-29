import Market from '../../vendor/interfaces/market';
import * as Gdax from 'gdax';
import { Currency } from '../../vendor/interfaces/currency.enum';
import { Account, CoinbaseAccount } from 'gdax';
import { Accounts } from '../../vendor/market/accounts';
import { promisify } from 'util';

class BinanceAccounts implements Accounts {
    allMarketAccounts: any[]

    client: any

    constructor(client: Gdax.AuthenticatedClient) {
        this.client = client
    }

    async availableFunds(currency: Currency): Promise<number> {
        const getBalances = promisify(this.client.balance)
        const balances = await getBalances()

        if (!balances[currency]) {
            throw new Error(`Currency ${currency} was not found in the balances`)
        }

        return parseFloat(balances[currency].available)
    }
}

export default BinanceAccounts