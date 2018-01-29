import { Currency } from "../interfaces/currency.enum";

export interface Accounts {
    // private allAccounts: any[] // FIXME: hard to maintain cache and reload when needed
    allMarketAccounts: any[]

    client: any

    marketAccounts(): Promise<any[]>

    marketAccountByCurrency(currency: string): Promise<any>

    accounts(): Promise<any[]>

    account(id: string): Promise<any>

    history(accountId: string): Promise<any>

    availableFunds(currency: string): Promise<number>

    fundsOnHold(currency: string): Promise<number>

    hasFundsOnHold(currency: string): Promise<boolean>

    accountByCurrency(currency: string): Promise<any>

    deposit(amount: number, paymentMethod: any): Promise<any>

    withdraw(amount: number, currency: Currency, address: string): Promise<any>

    withdrawCrypto(amount: number, currency: Currency, address: string): Promise<any>

    paymentMethods(): Promise<any[]>

    paymentMethodByCurrency(currency: Currency): Promise<any>
}