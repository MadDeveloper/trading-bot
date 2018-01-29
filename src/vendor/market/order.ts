export interface BaseOrderInfo {
    id: string;
    price: number;
    size: number;
    product_id: string;
    side: 'buy' | 'sell';
    stp: 'dc' | 'co' | 'cn' | 'cb';
    type: 'limit' | 'market' | 'stop';
    created_at: string;
    post_only: boolean;
    fill_fees: number;
    filled_size: number;
    status: 'received' | 'open' | 'done' | 'pending';
    settled: boolean;
    executed_value: number;
}

export interface OrderResult extends BaseOrderInfo {
    time_in_force: 'GTC' | 'GTT' | 'IOC' | 'FOK';
    status: 'received' | 'open' | 'done';
}