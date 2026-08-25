import { WebSocket } from 'ws'
import axios from 'axios'
import type { orderBook, BackendResponse, DepthMessage, WsControlMessage } from './Types/types'

const OrderBook: orderBook = { bids: {}, asks: {} }

let OrderBookInitialized = false;
let lastUpdatedId = 0;
const buffer: { updatedAsks: [string, string][], updatedBids: [string, string][], lastUpdatedId: number }[] = []

const wsURL = process.env.WS
const beURL = process.env.Backend
const wss = new WebSocket(wsURL!)

function updateOrderBook(updatedAsks: [string, string][], updatedBids: [string, string][]) {
  updatedAsks.forEach(([price, qty]) => {
    if (qty === "0")  delete OrderBook.asks[price];
    else  OrderBook.asks[price] = qty
  })
  updatedBids.forEach(([price, qty]) => {
    if (qty === "0")  delete OrderBook.bids[price];
    else OrderBook.bids[price] = qty
  })
}

wss.onmessage = (msg) => {
  console.log("on message")
  const data: DepthMessage | WsControlMessage = JSON.parse(msg.data.toString())

  if (!("asks" in data) || !("bids" in data) || !("lastUpdatedId" in data)) {
    console.log("Ignoring non-depth message")
    console.log("Acknowledgment: ", data.result)
    return
  }
  
  const updatedAsks = data.asks
  const updatedBids = data.bids
  lastUpdatedId = data.lastUpdatedId

  if (!OrderBookInitialized) {
    buffer.push({ updatedAsks, updatedBids, lastUpdatedId })
    console.log(buffer)
  } else {
    console.log(OrderBookInitialized)
    updateOrderBook(updatedAsks, updatedBids)
  }
}

wss.onopen = async () => {
  console.log("sending message to ws")
  wss.send(JSON.stringify({ method: "SUBSCRIBE", params: ["depth.SOL"] }))
  try {
    console.log("asking backend")
    const response = await axios.get(`${beURL}/api/v1/order/depth/SOL`)
    console.log("response from backend")
    const data: BackendResponse = response.data
    console.log(data.asks)

    if (Object.keys(data.asks).length != 0) {
      data.asks.forEach(({ price, totalQty }) => OrderBook.asks[price] = totalQty);
    }
    if (Object.keys(data.bids).length != 0) {
      data.bids.forEach(({ price, totalQty }) => OrderBook.bids[price] = totalQty);
    }

    OrderBookInitialized = true
    console.log(OrderBookInitialized)

    if (data.lastUpdatedId > lastUpdatedId) {
      buffer.forEach((data) => {
        data.updatedAsks.forEach(([price, qty]) => OrderBook.asks[price] = qty)
        data.updatedBids.forEach(([price, qty]) => OrderBook.bids[price] = qty)
      })
    }
  } catch (error) {
    console.log(error)
  }
}

setInterval(() => {
  // Highest price first
  const bids = Object.entries(OrderBook.bids).sort((a, b) => Number(b[0]) - Number(a[0]));

  // Lowest price first
  const asks = Object.entries(OrderBook.asks).sort((a, b) => Number(a[0]) - Number(b[0])); 

  console.log("===== BIDS =====");
  bids.forEach(([price, qty]) => {
    console.log(`Price: ${price} | Qty: ${qty}`);
  });

  console.log("\n===== ASKS =====");
  asks.forEach(([price, qty]) => {
    console.log(`Price: ${price} | Qty: ${qty}`);
  });
}, 2000);