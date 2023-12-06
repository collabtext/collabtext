/**
 * Maintains a WebSocket connection to the signaling server
 * 
 * At the moment doesn't do much, just a template to be filled out with
 * the actual details
 */
class SignalClient {
  constructor() {
    this.socket = null
    this.userId = null
    this.peers = []
  }

  connect = async () => {
    console.log("[signalClient] Trying to open a connection...")
    this.socket = await this.constructWebSocket(
      "ws://localhost:4040/socketserver",
      "protocolOne",
    )

    this.socket.onerror = console.error

    // On connection established...
    this.socket.onopen = this.onOpen

    // On receipt of a message...
    this.socket.onmessage = this.onMessage
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
    console.log("[signalClient] Closing the connection...")
    this.socket?.close()
    this.userId = null
    this.peers = []
  }

  onOpen = () => {
    console.log("[signalClient] Connection established...")

    // Send a join message
    // this.send({ type: "presence", action: "join" })
  }

  onMessage = event => {
    const msg = JSON.parse(event.data)
    switch (msg.type) {
      case "ping":
        console.log("[signalClient] Received a ping", msg)
        break
      case "welcome":
        console.log("[signalClient] Received a welcome message", msg)
        this.onWelcome(msg)
        break
      case "presence":
        console.log("[signalClient] Received a presence update", msg)
        this.onPresence(msg)
        break
      default:
        console.error("[signalClient] unknown message type", msg)
    }
  }

  onWelcome = (msg) => {
    // Probably should call an event handler passed down by a parent class
    // That class should then create direct connections to the other peers
    const { peers, userId } = msg
    this.userId = userId
    this.peers = peers
  }

  onPresence = (msg) => {
    if (msg.action === "join") {
      // open a direct connection...
      const { id } = msg
      this.peers = this.peers.concat(id)
    } else if (msg.action === "leave") {
      // close the connection...
    }
  }

  send = (json) => {
    this.socket.send(JSON.stringify(json))
  }

  sendPing = () => {
    console.log("[signalClient] Sending a ping to the signaling server...")
    this.send({ type: "ping" })
  }
}

export default SignalClient
