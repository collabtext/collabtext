class SignalClient {
  constructor() {
    this.socket = null
  }

  connect = () => {
    console.log("[signalClient] Trying to open a connection...")
    this.socket = new WebSocket(
      "ws://localhost:4040/socketserver",
      "protocolOne",
    )

    this.socket.onerror = console.log

    this.socket.onopen = () => {
      console.log("[signalClient] Connection established...")
    }

    // On receipt of a message...
    this.socket.onmessage = event => {
      const msg = JSON.parse(event.data)
      switch (msg.type) {
        case "ping":
          console.log("[signalClient] Received a ping from the signaling server")
          break;
      }
    }
  }

  close = () => {
    console.log("[signalClient] Closing the connection...")
    this.socket?.close()
  }

  sendPing = () => {
    console.log("[signalClient] Sending a ping to the signaling server...")
    this.socket.send(JSON.stringify({ type: "ping" }))
  }
}

export default SignalClient
