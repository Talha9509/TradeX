import { Balances, OrderBook } from '../Types/types'
import { Orders } from '../Types/OrderFillsType'
import { CreateOrder } from '../Options/CreateOrder'

export default function seedEngine() {
  const seedBalances = [
    { userId: 1, USD: 10000, SOL: 100, BTC: 100, ETH: 100 },
    { userId: 2, USD: 10000, SOL: 100, BTC: 100, ETH: 100 },
    { userId: 3, USD: 10000, SOL: 100, BTC: 100, ETH: 100 },
    { userId: 4, USD: 10000, SOL: 100, BTC: 100, ETH: 100 },
  ]

  for (const user of seedBalances) {
    Balances.set(user.userId, new Map([
      ['USD', { available: user.USD, locked: 0 }],
      ['SOL', { available: user.SOL, locked: 0 }],
      ['BTC', { available: user.BTC, locked: 0 }],
      ['ETH', { available: user.ETH, locked: 0 }],
    ]))
  }

  // these all are limit orders
  CreateOrder({ "stockName": "SOL", "type": "limit", "side": "buy", "price": 100, "quantity": 4 }, 1)
  CreateOrder({ "stockName": "SOL", "type": "limit", "side": "sell", "price": 100, "quantity": 15 }, 2)
  CreateOrder({ "stockName": "SOL", "type": "limit", "side": "sell", "price": 200, "quantity": 50 }, 3)
  CreateOrder({ "stockName": "BTC", "type": "limit", "side": "buy", "price": 200, "quantity": 9 }, 1)
  CreateOrder({ "stockName": "BTC", "type": "limit", "side": "sell", "price": 500, "quantity": 10 }, 2)
  CreateOrder({ "stockName": "ETH", "type": "limit", "side": "buy", "price": 40, "quantity": 60 }, 3)
  CreateOrder({ "stockName": "ETH", "type": "limit", "side": "sell", "price": 100, "quantity": 6 }, 4)

  console.log(Object.fromEntries(OrderBook))
  console.log('[engine seed] initialized balances and order book with', Orders.size, 'orders')
}
