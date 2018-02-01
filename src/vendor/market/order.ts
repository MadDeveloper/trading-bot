import { Currency } from '../interfaces/currency.enum';

export interface BaseOrderInfo {
    id: string;
    clientOrderId: string;
    price: number;
    symbol: Currency;
    side: 'buy' | 'BUY' | 'sell' | 'SELL';
    type: 'limit' | 'LIMIT' | 'market' | 'MARKET' | 'stop' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT';
    status: 'received' | 'open' | 'done' | 'pending' | 'FILLED';
    originQuantity: number;
    executedQuantity: number;
    transactionTime: number;
    fills?: OrderFill[]
}

export interface OrderResult extends BaseOrderInfo {
    timeInForce: 'GTC' | 'GTT' | 'IOC' | 'FOK';
}

export interface OrderFill {
    price: number
    quantity: number
    commission: number
    commissionAsset: Currency
}