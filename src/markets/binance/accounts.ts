import Market from '../../vendor/interfaces/market';
import * as Gdax from 'gdax';
import { Currency } from '../../vendor/interfaces/currency.enum';
import { Account, CoinbaseAccount } from 'gdax';
import { Accounts } from '../../vendor/market/accounts';

class GdaxAccounts implements Accounts {
    // private allAccounts: any[] // FIXME: hard to maintain cache and reload when needed
    allMarketAccounts: any[]

    client: Gdax.AuthenticatedClient

    constructor(client: Gdax.AuthenticatedClient) {
        this.client = client
    }

    async marketAccounts(): Promise<CoinbaseAccount[]> {
        if (!Array.isArray(this.allMarketAccounts)) {
            this.allMarketAccounts = await this.client.getCoinbaseAccounts()
        }

        return this.allMarketAccounts
    }

    async marketAccountByCurrency(currency: string): Promise<CoinbaseAccount> {
        const marketAccounts = await this.marketAccounts()
        const marketAccountsFound = marketAccounts.filter(account => account.currency === currency)

        if (marketAccountsFound.length === 0) {
            return null
        }

        return marketAccountsFound[0]
    }

    accounts(): Promise<Account[]> {
        return this.client.getAccounts()
        // FIXME: need to be more flexible and permets cache reload
        // if (!Array.isArray(this.allAccounts)) {
        //     this.allAccounts = await this.client.getAccounts()
        // }

        // return this.allAccounts
    }

    account(id: string): Promise<Account> {
        return this.client.getAccount(id)
    }

    history(accountId: string): Promise<any> {
        return this.client.getAccountHistory(accountId)
    }

    async availableFunds(currency: string): Promise<number> {
        const account = await this.accountByCurrency(currency)

        return parseFloat(account.available)
    }

    async fundsOnHold(currency: string): Promise<number> {
        const account = await this.accountByCurrency(currency)

        return parseInt(account.holds)
    }

    async hasFundsOnHold(currency: string): Promise<boolean> {
        const fundsOnHold = await this.fundsOnHold(currency)

        return fundsOnHold > 0
    }

    async accountByCurrency(currency: string): Promise<any> {
        const accounts = await this.accounts()
        const accountsFound = accounts.filter(account => account.currency === currency)

        if (accountsFound.length === 0) {
            return null
        }

        return accountsFound[0]
    }

    deposit(amount: number, paymentMethod: any): Promise<any> {
        return this.client.deposit({
            amount,
            currency: paymentMethod.currency,
            payment_method_id: paymentMethod.id
        })
    }

    withdraw(amount: number, currency: Currency, address: string): Promise<any> {
        return this.client.withdrawCrypto({
            amount,
            currency,
            coinbase_account_id: address
        })
    }

    withdrawCrypto(amount: number, currency: Currency, address: string): Promise<any> {
        return this.client.withdrawCrypto({
            amount,
            currency,
            crypto_address: address
        })
    }

    paymentMethods(): Promise<any[]> {
        return (<any>this.client).getPaymentMethods()
    }

    async paymentMethodByCurrency(currency: Currency): Promise<any> {
        const paymentMethods = await this.paymentMethods()
        const paymentMethodsFound = paymentMethods.filter(method => method.currency === currency)

        if (paymentMethods.length === 0) {
            return null
        }

        return paymentMethods[0]
    }
}

export default GdaxAccounts