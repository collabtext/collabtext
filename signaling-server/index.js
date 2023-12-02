/**
 * A WebSockets server which broadcasts received messages to connected clients.
 * Messages are sent to all clients other than the original sender.
 * 
 * Reference: https://github.com/websockets/ws#server-broadcast
 */

//import WebSocket, { WebSocketServer } from 'ws'

const WebSocket = require('ws')
const WebSocketServer = WebSocket.WebSocketServer

const wss = new WebSocketServer({ port: 4040 })

wss.on('connection', (ws) => {
  ws.on('error', console.error)

  ws.on('message', (data, isBinary) => {
    // This would be the place to handle different kinds of messages
    // For now, we just broadcast everything we receive

    // Log messages
    console.log('message rcvd:', data.toString())

    // Broadcast
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data, { binary: isBinary })
      }
    })
  })
})
