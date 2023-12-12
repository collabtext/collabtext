/**
 * A signaling server
 */

const { WebSocketServer } = require("ws")

const { SignalingServer } = require("./signalingServer")

const wss = new WebSocketServer({ port: 4040 })

const signalingServer = new SignalingServer(wss)

console.log("Created a signaling server:", signalingServer.counter)
