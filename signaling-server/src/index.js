/**
 * A signaling server
 */

const { WebSocketServer } = require("ws")

const { SignalingServer } = require("./signalingServer")

const host = process.env.HOST || '127.0.0.1'

const wss = new WebSocketServer({ port: 4040, host: host })

const signalingServer = new SignalingServer(wss)

console.log("Created a signaling server:", signalingServer.counter)
