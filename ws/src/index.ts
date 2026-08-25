import { WebSocketServer, type WebSocket } from 'ws'
import { StreamClient } from './config/redis'
import createConsumerGroup from './utils/createConsumerGroup'
import { type update, type data } from './Types/types'

const wss = new WebSocketServer({ port: 8080 })

export const GROUP_ID = Math.round(Math.random() * 100)
const streamKey = 'engine_to_ws'
const groupName = `ws-${GROUP_ID}`
const consumerName = `worker_${process.pid}`;

await createConsumerGroup(streamKey, groupName)

const activeSubscriptions: Record<string, WebSocket[]> = {}

async function poll() {
  const responses = await StreamClient.xReadGroup(groupName, consumerName,
    { key: streamKey, id: '>' },
    { COUNT: 10, BLOCK: 0 }
  )
  if (!responses) {
    poll()
  } else {
    for (const response of responses) {
      for (const message of response.messages) {
        const parsedUpdate: update = JSON.parse(message.message.update)
        console.log(parsedUpdate)
        activeSubscriptions[parsedUpdate.stream]?.forEach((ws) => {
          if (ws.readyState === ws.OPEN){
            ws.send(JSON.stringify({ ...parsedUpdate.data, lastUpdatedId: parsedUpdate.lastUpdatedId }))
            console.log("sent message")
            console.log(parsedUpdate.lastUpdatedId)
            console.log(parsedUpdate.data.asks)
            console.log(parsedUpdate.data.bids)
          } 
        })
        await StreamClient.xAck(streamKey, groupName, message.id)
      }
    }
    poll()
  }
}
poll()

wss.on('connection', async (socket: WebSocket) => {
  socket.on("message", (data: string) => {
    const parsedData: data = JSON.parse(data)
    // {"method":"SUBSCRIBE","params":["depth.BTC"]}
    if (parsedData.method == 'SUBSCRIBE') {
      parsedData.params.forEach((param) => {
        if (!activeSubscriptions[param]) {
          activeSubscriptions[param] = []
        }
        activeSubscriptions[param].push(socket)
      })
      console.log("subscribed")
      console.log(JSON.stringify(parsedData))
      console.log(JSON.stringify(activeSubscriptions))
      socket.send(JSON.stringify({ result: "subscribed" }))
    } else {
      parsedData.params.forEach((param) => {
        if (!activeSubscriptions[param]) {
          activeSubscriptions[param] = []
        }
        activeSubscriptions[param] = activeSubscriptions[param].filter(websocket => websocket !== socket)
      })
      console.log("unsubscribed")
      console.log(JSON.stringify(activeSubscriptions))
    }
  })

  socket.on("close", () => {
    Object.keys(activeSubscriptions).forEach((stream) => {
      const sockets = activeSubscriptions[stream]
      if (sockets) {
        activeSubscriptions[stream] = sockets.filter((websocket) => websocket !== socket)
      }
    })
  })
})