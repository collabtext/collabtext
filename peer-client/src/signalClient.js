/**
 * Represents a peer
 */
export class Peer {
  constructor(id) {
    this.id = id
  }
}

/**
 * Maintains a WebSocket connection to the signaling server
 */
class SignalClient {
  constructor() {
    this.socket = null
    this.userId = null
    this.peers = []
    this.handlers = {}
  }

  connect = async (handlers) => {
    // If a previous connection exists, do not create a new one
    if (this.socket && this.socket.readyState === "open") {
      console.log("Reusing a previous connection...")
      return
    }

    // Reset
    this.socket = null
    this.userId = null
    this.peers = []
    this.handlers = {}

    // Open a WebSocket connection
    console.log("[signalClient] Trying to open a connection...")
    this.socket = await this.constructWebSocket(
      "ws://localhost:4040/socketserver",
      "protocolOne",
    )

    // Register event handlers
    this.socket.onerror = console.error
    this.socket.onclose = this.onClose
    this.socket.onmessage = this.onMessage

    this.handlers = handlers

    // Send a join message
    console.log("[signalClient] Connection established, sending a join...")
    this.sendJoin()
  }

  constructWebSocket = (url, protocol) => {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url, protocol)
      socket.onopen = () => {
        resolve(socket)
      }
      socket.onerror = (err) => {
        reject(err)
      }
    })
  }

  close = () => {
    // Send a leave message
    console.log("[signalClient] Closing the connection...")
    if (this.socket) {
      this.sendLeave()
      this.socket.close()
    }
  }

  onClose = () => {
    console.log("[signalClient] Connection closed...")
    this.socket = null
    this.userId = null
    this.peers = []
    this.handlers = {}
  }

  onMessage = event => {
    const msg = JSON.parse(event.data)
    switch (msg.type) {
      case "welcome":
        this.onWelcome(msg)
        break
      case "presence":
        this.onPresence(msg)
        break
      default:
        console.error("[signalClient] unknown signal:", msg)
    }
  }

  onWelcome = (msg) => {
    const { peers, id } = msg
    this.userId = id
    this.peers = peers.map(peer => new Peer(peer.id))

    if (this.handlers.onWelcome) {
      this.handlers.onWelcome(this.userId, this.peers)
    }
  }

  onPresence = (msg) => {
    switch (msg.action) {
      case "join": {
        // Open a direct connection...
        const { id } = msg
        const peer = new Peer(id)
        this.peers.push(peer)

        if (this.handlers.onJoin) {
          this.handlers.onJoin(peer)
        }
        break
      } case "leave": {
        // Close the connection...
        const peer = this.peers.find(p => p.id === msg.id)
        this.peers = this.peers.filter(p => p.id !== msg.id)
        if (this.handlers.onLeave) {
          this.handlers.onLeave(peer)
        }
        break
      }
      default: {
        console.error("[signalClient] unknown action:", msg)
      }
    }
  }

  send = (json) => {
    console.log("[signalClient] sending:", json)
    this.socket.send(JSON.stringify(json))
  }

  sendJoin = () => {
    this.send({
      to: "server",
      type: "presence",
      action: "join"
    })
  }

  sendLeave = () => {
    this.send({
      to: "server",
      type: "presence",
      action: "leave"
    })
  }
}

export default SignalClient
