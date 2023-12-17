/**
 * A signaling server
 */

const express = require("express")
const { createServer } = require("http")
const { WebSocketServer } = require("ws")
const { SignalingServer } = require("./signalingServer")

const app = express()
app.use(express.static("dist-static"))

const server = createServer(app)
const wss = new WebSocketServer({ server })
const signalingServer = new SignalingServer(wss)

const PORT = process.env.PORT || 3000

server.listen(PORT)

console.log(`Created a signaling server, running at port ${PORT}`)
console.log(`Heartbeat interval: ${signalingServer.heartBeatInterval} ms`)
