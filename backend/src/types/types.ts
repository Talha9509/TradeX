import { z } from 'zod'

export const SignupSchema = z.object({
  email: z.email("Invalid Email"),
  password: z.string().min(6, "Min 6 characters")
})

export const SigninSchema = z.object({
  email: z.email("Invalid Email"),
  password: z.string().min(6, "Min 6 characters")
})

export const Order = z.object({
  stockName: z.enum(["SOL", "BTC", "ETH"]),
  type: z.enum(["limit", "market"]),
  side: z.enum(["buy", "sell"]),
  price: z.number().nullable(),
  quantity: z.number().int().positive()
}).superRefine((data, ctx) => {
  if(data.type == "limit"){
    if(!data.price || data.price <= 0){
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid price to buy/sell",
        path: ["price"]
      })
    }
  }
})

export type EngineRequest = {
  payload: Record<string | number, any>,
  Identifier: number, 
  userId: number | null,
  function: EngineCommandType
}

export type BalanceData = {
  available: number
  locked: number
}

export type OrderResponseData = {
  orderId: string
  userId: number
  market: "SOL" | "BTC" | "ETH"
  price: number
  quantity: number
  type: "limit" | "market"
  side: "buy" | "sell"
  filledQty: number
  status: "Open" | "Filled" | "Cancelled" | "Partially-filled"
  fills: any[]
  createdAt: string
}

export type EngineResponse = {
  ok: boolean;
  data?: Record<string, any>;
  error?: string;
  Identifier: number, 
}

export type EngineCommandType =
  | "create_order"
  | "cancel_order"
  | "get_user_balance"
  | "get_order"
  | "get_depth"

export type MessageType = {
    id: string,
    message: {
      ToBackendStringified: string
    }
}[]
