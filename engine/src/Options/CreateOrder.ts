import { OrderBook, type updatedAsksBids } from '../Types/types'
import { Orders, Fills, type OrderRecord, type Fill } from '../Types/OrderFillsType'
import getOrCreateBalance from "../utils/getOrCreateBalance";
import restOrderOnBook from '../utils/restOrderonBook'

export const CreateOrder = (data: Record<string | number, any>, userId: number) => {
  let buyerBalance;
  let sellerBalance;
  let incomingBalance;
  let makerBalances: Record<number, any> = {};
  let otherOrders: OrderRecord[] = [];
  let updatedAsks: updatedAsksBids = {}
  let updatedBids: updatedAsksBids = {}
  // 2. check balance of user if he has money for req quantity, stock for selling
  const asset =  data.stockName
  const balance = getOrCreateBalance(userId!)
  incomingBalance = balance
  console.log(`Step 2.1: Balance`)
  console.log(balance)

  const available = data.side == "buy" ? balance?.get('USD')?.available : balance?.get(asset)?.available
  console.log(`Step 2.2: available ${available}`)
  const reqAmount = data.side == "buy" ? (data.price * data.quantity) : data.quantity
  console.log(`Step 2.3: req amount ${reqAmount}`)
  if (available! < reqAmount) throw Error("No balance")

  const usd = balance?.get("USD")!;
  const assetBalance = balance?.get(asset)!;

  // 3. reduce the balance or lock in case of limit
  if(data.type == 'limit'){
    if (data.side == "buy") {
      usd.locked += reqAmount
      usd.available -= reqAmount
      console.log(`Step 3.1.1: Balance`)
      console.log(balance)
    } else {
      assetBalance.locked += reqAmount
      assetBalance.available -= reqAmount
      console.log(`Step 3.1.2: Balance`)
      console.log(balance)
    }
  }
  // console.log(`Step 3.1.3: USD/Assets locked`)

  const incomingOrder: OrderRecord = {
    orderId: crypto.randomUUID()  ,
    userId: userId,
    market: asset,
    price: data.price,
    quantity: data.quantity,
    type: data.type,
    side: data.side,
    fills: [],
    filledQty: 0,
    status: "Open",
    createdAt: new Date().toISOString()
  }
  console.log(`Step 3.2: Incoming Order ${JSON.stringify(incomingOrder)}`)
  Orders.set(incomingOrder.orderId, incomingOrder)
  console.log(`Step 3.3: Orders ${JSON.stringify(Orders)}`)

  // Matching algorithm:
  // if buy then check asks
  // if sell then check bids
  // if kept on limit to buy on 140, then if lesser than 140 also it should match, same for selling
  const oppSide = data.side == "buy" ? "asks" : "bids"
  const AssetInOrderBook = OrderBook.get(asset)
    if (!AssetInOrderBook) {
    throw new Error(`Asset not in orderbook: ${AssetInOrderBook}`)
  }
  const oppBook = AssetInOrderBook[oppSide]
  const asksBook = AssetInOrderBook["asks"]
  const bidsBook = AssetInOrderBook["bids"]
  // const oppBook = OrderBook[asset][oppSide]

  console.log(`Step 4.1: opp book`)
  console.log(oppBook)

  const sortedPrices = [...oppBook.keys()].sort((a, b) => incomingOrder.side == "buy" ? a - b : b - a)
  console.log(`Step 4.2: sorted prices ${sortedPrices}`)
  if(sortedPrices.length == 0 && incomingOrder.type == 'market') incomingOrder.status = "Cancelled";

  const orderFill = []
  for(const levelPrice of sortedPrices){
    if(incomingOrder.filledQty >= incomingOrder.quantity) break

    const crosses = incomingOrder.type == "market" || 
    (incomingOrder.type == 'limit' && incomingOrder.side == "buy" && levelPrice <= incomingOrder.price) || 
    (incomingOrder.side == "sell" && levelPrice >= incomingOrder.price)
    if(!crosses) break

    const level = oppBook.get(levelPrice)
    console.log(`Step 4.3: level ${JSON.stringify(level)}`)

    while(level?.orders != undefined && level.orders.length > 0 && incomingOrder.filledQty < incomingOrder.quantity){
      const makerOrder = level.orders[0]
      if(incomingOrder.userId == makerOrder?.userId || !makerOrder) {
        console.log("can't trade with yourself")
        level.orders.shift();
        continue;
      }
      console.log(`Step 4.4: maker Order ${JSON.stringify(makerOrder)}`)

      const incomingRemaining = incomingOrder.quantity - incomingOrder.filledQty
      const makerRemaining = makerOrder.quantity - makerOrder.filledQty
      const marketBuyLessUSD = (incomingOrder.side == 'buy' && incomingOrder.type == 'market') ? Math.floor(usd.available / makerOrder.price) : makerRemaining
      const matchedQty = Math.min(incomingRemaining, makerRemaining, marketBuyLessUSD)
      console.log(`Step 4.5: matchedQty ${matchedQty}`)

      const reqAmountt = matchedQty * makerOrder.price

      
      const oneMakerBalances = [];
      const makerBalance = getOrCreateBalance(makerOrder.userId)
      oneMakerBalances.push(makerBalance)
      makerBalances[makerOrder.userId] = makerBalance

      if (incomingOrder.type == 'market') {
        if (matchedQty == 0 || (incomingOrder.side == 'buy' && reqAmountt > usd?.available!)) {
          incomingOrder.status = incomingOrder.filledQty > 0 ? "Partially_filled" : 'Cancelled';
          // if(incomingOrder.side == 'buy' && incomingOrder.filledQty > 0){
          //   const ask = asksBook.get(makerOrder.price)
          //   console.log("ask- ")
            // console.log(JSON.stringify(ask))
            // updatedAsks[reqAmountt] = String(ask?.totalQty!)
            // console.log("updated asks"+(ask?.totalQty!))
          // }
          // else if(incomingOrder.side == 'sell' && incomingOrder.filledQty > 0){
          //   const bid = bidsBook.get(makerOrder.price)
          //   updatedBids[reqAmountt] = String(bid?.totalQty! - incomingOrder.filledQty)
          // }
          return { order: incomingOrder, fills: orderFill, message: incomingOrder.filledQty > 0 && 'Not enough balance, so order is partially filled', userId, incomingBalance, otherOrders, makerBalances: Object.keys(makerBalances).length > 0 ? makerBalances : null, createOrCancel: 'create', updatedAsks, updatedBids, asset: incomingOrder.market }
        }
      }

      incomingOrder.filledQty += matchedQty
      makerOrder.filledQty += matchedQty
      console.log(`Step 4.6.1: incomingorder: ${JSON.stringify(incomingOrder)}`)
      console.log(`Step 4.6.2: makerorder: ${JSON.stringify(makerOrder)}`)
      if(incomingOrder.filledQty === incomingOrder.quantity) incomingOrder.status = "Filled"
      if(makerOrder.filledQty === makerOrder.quantity) makerOrder.status = "Filled"

      // if(incomingOrder.side == 'buy'){
      //   const ask = asksBook.get(makerOrder.price)
      //   console.log("ask- ")
      //   console.log(JSON.stringify(ask))
      //   updatedAsks[levelPrice] = String(ask?.totalQty! - incomingOrder.filledQty)
      //   console.log("updated asks"+(ask?.totalQty! - incomingOrder.filledQty))
      // } else {
      //   const bid = bidsBook.get(makerOrder.price)
      //   updatedBids[levelPrice] = String(bid?.totalQty! - incomingOrder.filledQty)
      // }

      const now = new Date().toISOString()
      const Fill: Fill = { 
        quantity: matchedQty, 
        side: incomingOrder.side, 
        userId: incomingOrder.userId, 
        price: levelPrice, 
        asset: asset, 
        buyOrderId: incomingOrder.side == 'buy' ? incomingOrder.orderId : makerOrder.orderId, 
        sellOrderId: incomingOrder.side == 'buy' ? makerOrder.orderId : incomingOrder.orderId, 
        fillId: crypto.randomUUID(), 
        createdAt: now 
      }
      Fills.push(Fill)
      incomingOrder.fills.push(Fill)
      makerOrder.fills.push(Fill)
      otherOrders.push(makerOrder)
      orderFill.push(Fill)
      // Fills.push({ quantity: matchedQty, side: makerOrder.side, type: "maker", userId: makerOrder.userId, price: levelPrice, asset: asset, orderId: makerOrder.id, createdAt: now })
      console.log(`Step 4.7: fills ${JSON.stringify(Fills)}`)

      const buyerId = data.side == "buy" ? incomingOrder.userId : makerOrder.userId
      const sellerId = data.side == "buy" ? makerOrder.userId : incomingOrder.userId
      buyerBalance = getOrCreateBalance(buyerId)
      sellerBalance = getOrCreateBalance(sellerId)
      // console.log(`Step 4.8: buyerbalance, sellerbalance`)
      // console.log(buyerBalance)
      // console.log(sellerBalance)
      const tradedUSD = levelPrice * matchedQty
      
      const buyerUSD = buyerBalance?.get("USD")!;
      const buyerAssetBalance = buyerBalance?.get(asset)!;
      const sellerUSD = sellerBalance?.get("USD")!;
      const sellerAssetBalance = sellerBalance?.get(asset)!;

      if (incomingOrder.type == 'market') {
        if(incomingOrder.side == 'buy'){
          buyerUSD.available = buyerUSD?.available! - reqAmountt
          buyerAssetBalance.available = buyerAssetBalance.available + matchedQty
          sellerUSD.available = sellerUSD.available + reqAmountt
          sellerAssetBalance.available = sellerAssetBalance.available - matchedQty
        } else {
          sellerAssetBalance.available = sellerAssetBalance.available - matchedQty
          sellerUSD.available = sellerUSD.available + reqAmountt
          buyerAssetBalance.available = buyerAssetBalance.available + matchedQty
          buyerUSD.available = buyerUSD.available - reqAmountt
        }
        // console.log(`Step 4.9: after exchange, buyerbalance, sellerbalance`)
        // console.log(buyerBalance)
        // console.log(sellerBalance)
      } else { 
        // if user gets the asset in less prize
        if(tradedUSD < buyerUSD.locked){
          const diff = buyerUSD.locked - tradedUSD
          buyerUSD.available += diff
          buyerUSD.locked -= diff
          console.log(`Step 4.8.1: buyer balance`)
          console.log(buyerBalance)
        }
        buyerUSD.locked -= tradedUSD
        buyerAssetBalance.available += matchedQty
        sellerAssetBalance.locked -= matchedQty
        sellerUSD.available += tradedUSD
        console.log(`Step 4.9: after exchange,`)
        console.log(`buyerbalance`)
        console.log(buyerBalance)
        console.log(`sellerbalance`)
        console.log(sellerBalance)
      }

      level.totalQty -= matchedQty
      console.log("after totalqty "+level.totalQty)
      if (incomingOrder.side == 'buy') {
        const ask = asksBook.get(makerOrder.price)
        updatedAsks[levelPrice] = String(ask?.totalQty!)
        console.log("updated asks" + (ask?.totalQty!))
      } else {
        const bid = bidsBook.get(makerOrder.price)
        updatedBids[levelPrice] = String(bid?.totalQty!)
        console.log("updated bids" + (bid?.totalQty!))
      }

      console.log(`Step 4.10: level ${JSON.stringify(level)}`)
      if(makerOrder.filledQty == makerOrder.quantity) level.orders.shift()
      }
    
    if(level?.orders.length == 0) oppBook.delete(levelPrice)
    console.log(`Step 4.11: level ${JSON.stringify(level)}`)
  }
  
  if(incomingOrder.type == 'market' && incomingOrder.side == 'sell' && incomingOrder.filledQty > 0 && incomingOrder.quantity > incomingOrder.filledQty) incomingOrder.status = 'Partially_filled' 

  if(incomingOrder.filledQty < incomingOrder.quantity && incomingOrder.type == "limit"){
    if(incomingOrder.side == 'buy'){
      const bid = bidsBook.get(incomingOrder.price)
      updatedBids[incomingOrder.price] = String((bid?.totalQty ?? 0)+ (incomingOrder.quantity - incomingOrder.filledQty))
    } else {
      const ask = asksBook.get(incomingOrder.price)
      updatedAsks[incomingOrder.price] = String((ask?.totalQty ?? 0) + (incomingOrder.quantity - incomingOrder.filledQty))
    }
    restOrderOnBook(incomingOrder)
    console.log(`Step 4.12: rest on orderbook`)
  }

  // console.log(`Step last: Balance `)
  // console.log(balance)
  return { order: incomingOrder, otherOrders: otherOrders.length > 0 ? otherOrders : null, fills: orderFill.length > 0 ? orderFill : null, incomingBalance, makerBalances: Object.keys(makerBalances).length > 0 ? makerBalances : null, userId, createOrCancel: 'create', updatedAsks, updatedBids, asset: incomingOrder.market }

  // 4. 
    // i. for market:
      // 1. match from the orderbook
      // 2. update the orderbook
      //  move usd from buyer to seller and asset from seller to buyer
      // 3. update order of his and other user who is buy/sell
      // 4. update fill of his and other user
    // ii. for limit:
      // 1. match the orderbook
      // 2. if not then sit on orderbook and update
      // 3. if any order matches then update order and fill
  // 5. update balance of user, orders table of both incoming and other order, fills table in db
}