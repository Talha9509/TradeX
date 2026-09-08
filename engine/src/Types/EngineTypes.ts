
export type EngineCommandType =
  | "create_order"
  | "cancel_order"
  | "get_user_balance"
  | "get_order"
  | "get_depth"

export type OrderType = {
  stockName: "SOL" | "BTC" | "ETH",
  type: "limit" | "market",
  side: "buy" | "sell",
  price: number | null,
  quantity: number
}

export type EngineRequest = {
  payload: Record<string | number, any>,
  Identifier: number, 
  userId: number | null,
  function: EngineCommandType
}

export type EngineResponse = {
  ok: boolean;
  data?: unknown;
  error?: string;
  Identifier: number, 
}

export const engTodb = 'engine_to_db'
export const engToWS = 'engine_to_ws'