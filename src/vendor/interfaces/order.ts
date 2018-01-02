export default interface Order {
    id: string,
    price: number,
    size: number,
    product_id: string,
    side: string,
    stp: string,
    type: string,
    time_in_force: string,
    post_only: boolean,
    created_at: string,
    fill_fees: number,
    filled_size: number,
    executed_value: number,
    status: string,
    settled: boolean
}