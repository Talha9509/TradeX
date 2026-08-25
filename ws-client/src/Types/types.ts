
export type orderBook = {
  bids: Record<string, string>,
  asks: Record<string, string>
}

export type BackendResponse = {
  asks: { price: string, totalQty: string }[],
  bids: { price: string, totalQty: string }[],
  lastUpdatedId: number
}

export type DepthMessage = {
  asks: [string, string][],
  bids: [string, string][],
  lastUpdatedId: number
}

export type WsControlMessage = {
  result: string
}
