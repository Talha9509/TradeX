import type { NextFunction, Request, Response } from 'express'
import { Order, type EngineRequest, type OrderResponseData, type BalanceData } from '../types/types'
import { client } from '../config/redis'
import { untilWeGetBack, betoEngKey } from '../utils/untilWeGetBack'

export const BuySell = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.userId!
  const validatedInput = Order.safeParse(req.body)
  if (!validatedInput.success) return res.status(400).json({ message: "Invalid Inputs" })
  const data = {
    stockName: validatedInput.data.stockName,
    type: validatedInput.data.type,
    side: validatedInput.data.side,
    price: validatedInput.data.type == 'limit' ? validatedInput.data.price : null,
    quantity: validatedInput.data.quantity
  }
  const Identifier = Math.round(Math.random() * 1000)
  
  try {
    const pendingResponse = untilWeGetBack(Identifier)
    const ToEngine: EngineRequest = { payload: data, Identifier, userId, function: 'create_order' }
    const ToEngineStringified = JSON.stringify(ToEngine)
    const response = await client.xAdd(betoEngKey, '*', { ToEngineStringified })
    console.log(response)

    const returnedData = await pendingResponse as { order: OrderResponseData; fills: any[], message?: any };
    console.log("returnedData: "+JSON.stringify(returnedData))
  
    return res.json({ message: returnedData.message ? returnedData.message : 'Order placed', filledQty: returnedData?.order?.filledQty, order: returnedData.order })
  } catch (error) {
    if (error instanceof Error && error.message === 'No balance') {
      return res.status(400).json({ success: false, message: 'Not enough balance' })
    }
    console.log(error)
    return next(error)
  }
}


export const DeleteOrder = async (req: Request, res: Response, next: NextFunction) => {
  const orderId = req.params.orderId as string
  const userId = req.userId!;
  const Identifier = Math.round(Math.random() * 1000)
  const payload = { orderId: orderId }
  
  try {
    const pendingResponse = untilWeGetBack(Identifier)
    const ToEngine: EngineRequest = { payload, Identifier, userId, function: 'cancel_order' }
    const ToEngineStringified = JSON.stringify(ToEngine)
    const response = await client.xAdd(betoEngKey, '*', { ToEngineStringified })
    console.log(response)

    const returnedData = await pendingResponse as { order: OrderResponseData };
    console.log("returnedData: " + JSON.stringify(returnedData))

    return res.json({ message: 'Order Cancelled', filledQty: returnedData?.order?.filledQty })
  } catch (error) {
    if (error instanceof Error && error.message === "Can't Cancel the Order") {
      return res.status(400).json({ success: false, message: "Can't Cancel the Order" })
    }
    console.log(error)
    return next(error)
  }
}


export const getOrderbyId = async (req: Request, res: Response, next: NextFunction) => {
  const orderId = req.params.orderId as string
  const userId = req.userId!
  const Identifier = Math.round(Math.random() * 1000)
  const payload = { orderId: orderId }
  
  try {
    const pendingResponse = untilWeGetBack(Identifier)
    const ToEngine: EngineRequest = { payload, Identifier, userId, function: 'get_order' }
    const ToEngineStringified = JSON.stringify(ToEngine)
    const response = await client.xAdd(betoEngKey, '*', { ToEngineStringified })
    console.log(response)

    const returnedData = await pendingResponse as { reqOrder: OrderResponseData };
    console.log("returnedData: " + JSON.stringify(returnedData))

    return res.json({ returnedData })
  } catch (error) {
    if (error instanceof Error && error.message === "The Order does not belong to you") {
      return res.status(400).json({ success: false, message: "The Order does not belong to you" })
    }
    console.log(error)
    return next(error)
  }
}


export const getBalance = async (req: Request, res: Response) => {
  const userId = req.userId!
  const Identifier = Math.round(Math.random() * 1000)
  const payload = { userId }
  
  try {
    const pendingResponse = untilWeGetBack(Identifier)
    const ToEngine: EngineRequest = { payload, Identifier, userId, function: 'get_user_balance' }
    const ToEngineStringified = JSON.stringify(ToEngine)
    const response = await client.xAdd(betoEngKey, '*', { ToEngineStringified })
    console.log(response)
    // await client.lPush('incoming-queue', JSON.stringify(ToEngine))

    const returnedData = await pendingResponse as { usd: BalanceData; btc: BalanceData; eth: BalanceData; sol: BalanceData };
    console.log("returnedData: " + JSON.stringify(returnedData))

    return res.json({ returnedData })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ meessage: 'Internal Server Error' })
  }
}


export const getDepthofAsset = async (req: Request, res: Response) => {
  const userId = req.userId!
  try {
    type assetType = 'SOL' | 'BTC' | 'ETH'
    const asset: assetType = req.params.asset as assetType
    const Identifier = Math.round(Math.random() * 1000)
    const payload = { asset: asset }
  
    const pendingResponse = untilWeGetBack(Identifier)
    const ToEngine: EngineRequest = { payload, Identifier, userId, function: 'get_depth' }
    const ToEngineStringified = JSON.stringify(ToEngine)
    const response = await client.xAdd(betoEngKey, '*', { ToEngineStringified })
    console.log(response)

    const returnedData = await pendingResponse as { bids: Array<{ price: number; totalQty: number; totalOrders: number }>; asks: Array<{ price: number; totalQty: number; totalOrders: number }>, lastUpdatedId: number };
    console.log("returnedData: " + JSON.stringify(returnedData))

    return res.json({ asks: returnedData.asks, bids: returnedData.bids, lastUpdatedId: returnedData.lastUpdatedId })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ meessage: 'Internal Server Error' })
  }
}















