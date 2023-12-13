const { WebSocket } = require("ws")

/**
 * A client node, represented by an ID-WebSocket pair
 */
class Client {
  constructor(id, ws) {
    this.id = id
    this.ws = ws
  }

  toJSON = () => {
    return { id: this.id }
  }
}

/**
 * A signaling server
 *
 * The responsibilities of this server include:
 * - group management (tracking joins and leaves)
 * - relaying WebRTC metadata needed for forming direct P2P connections
 *
 * This server recognizes only a handful of message types. The rest
 * are handled by relaying messages based on their "to" field. In other
 * words, the server knows the intended recipient but does not inspect
 * the content of all messages.
 *
 * Uses: https://github.com/websockets/ws
 */
class SignalingServer {
  /**
   * Constructs a server instance and begins listening for connections
   *
   * @param {WebSocketServer} wss a WebSocket server instance
   * @param {number} heartBeatInterval interval between heartbeats (in ms, default 10000)
   */
  constructor(wss, heartBeatInterval = 10000) {
    this.clients = []
    this.counter = 1
    this.wss = wss
    this.heartBeatInterval = heartBeatInterval

    // Start listening for connections
    this.wss.on("connection", this.onConnection)

    // Start sending out heartbeats
    const interval = this.startHearbeat()
    this.wss.on("close", () => {
      this.clearHeartbeat(interval)
    })
  }

  onConnection = (ws) => {
    // Generate an id for this client
    const id = this.generateId()
    const client = new Client(id, ws)
    this.clients.push(client)

    // Register event handlers
    // https://github.com/websockets/ws/blob/master/doc/ws.md
    ws.on("message", (data) => this.onMessage(client, data))
    ws.on("error", (error) => this.onError(client, error))
    ws.on("close", (code) => this.onClose(client, code))

    // Heartbeat
    this.registerHearbeat(client)
  }

  onClose = (client) => {
    const c = this.find(client.id)
    if (!c) {
      // Everything is already in order
      return
    }

    // Connection closed without an appropriate leave message
    // --> Notify other peers
    this.broadcastLeave(client)

    // Remove this client from our list
    this.clients = this.clients.filter(c => c.id !== client.id)
  }

  onMessage = (client, data) => {
    const msg = JSON.parse(data.toString())

    // Log messages
    console.log(`message rcvd from ${client.id}:`, msg)

    // Check the intended recipient
    if (msg.to === "server") {
      this.handleServerMessage(client, msg)
    } else if (msg.to === "all") {
      this.broadcast(client, msg)
    } else {
      const toId = Number.parseInt(msg.to)
      const client = this.find(toId)
      if (!client) {
        console.error(`Error: cannot forward message (recipient unknown):`, msg)
        return
      }

      this.send(client, msg)
    }
  }

  handleServerMessage = (client, msg) => {
    if (msg.type !== "presence") {
      console.error("Unknown message type:", msg)
      return
    }

    switch (msg.action) {
      case "join": {
        // Send a welcome message
        this.handleJoin(client)
        break
      }
      case "leave": {
        // Broadcast a leave message
        this.handleLeave(client)
        break
      }
      default: {
        console.error("Error: unknown action:", msg)
      }
    }
  }

  handleJoin = (client) => {
    // Send a welcome message
    // Note: no need to update the list, done at connect
    this.sendWelcome(client)
    this.broadcastJoin(client)
  }

  handleLeave = (client) => {
    // Broadcast a leave message
    // Also remove this client from our list
    this.broadcastLeave(client)
    this.clients = this.clients.filter(c => c.id !== client.id)
  }

  onError = (client, error) => {
    console.error(`Error: client ${client}:`, error)
  }

  sendWelcome = (client) => {
    const peers = this.clients
      .filter(c => c.id !== client.id)
      .map(c => c.toJSON())
    this.send(client, {
      type: "welcome",
      id: client.id,
      peers,
    })
  }

  send = (to, msg) => {
    if (to.ws.readyState !== WebSocket.OPEN) {
      // TODO: Unable to send a message --> Decide what to do
      console.error(`Error: could not send msg to client ${to.id} (connection not open):`, msg)
      return
    }

    // Log messages
    console.log("message sent to:", to.id, "msg:", msg)

    to.ws.send(JSON.stringify(msg))
  }

  broadcast = (from, msg) => {
    this.clients.forEach(client => {
      if (client.id !== from.id) {
        this.send(client, msg)
      }
    })
  }

  broadcastJoin = (from) => {
    this.broadcast(from, {
      type: "presence",
      action: "join",
      id: from.id,
    })
  }

  broadcastLeave = (from) => {
    this.broadcast(from, {
      type: "presence",
      action: "leave",
      id: from.id,
    })
  }

  find = (id) => {
    return this.clients.find(client => client.id === id)
  }

  generateId = () => {
    return this.counter++
  }

  registerHearbeat = (client) => {
    // Heartbeat
    // https://github.com/websockets/ws#how-to-detect-and-close-broken-connections
    const { ws } = client
    ws.isAlive = true
    ws.on("pong", () => { ws.isAlive = true })
  }

  startHearbeat = () => {
    const interval = setInterval(() => {
      for (const client of this.clients) {
        const { ws } = client
        if (ws.isAlive === false) {
          // No heartbeat response
          // --> this client is unresponsive
          console.log("No heartbeat response for client", client.id)
          this.handleLeave(client)
          ws.terminate()
        }

        // Start a new round
        ws.isAlive = false
        ws.ping()
      }
    }, this.heartBeatInterval)

    return interval
  }

  clearHeartbeat = (interval) => {
    clearInterval(interval)
  }
}

module.exports = {
  SignalingServer
}
