import { TradeType } from "./trade-type"

export interface Trade {
  price: number
  quantity: number
  time: number
  benefits: number
  fees: number
  type: TradeType
}
