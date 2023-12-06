import SignalClient from "./signalClient"
import PeerConnection from "./peerConnection"

/**
 * Offers methods for network communication
 * 
 * Connects to a signaling server AND maintains direct P2P connections
 */
class Messenger {
  constructor() {
    this.signaling = null
    this.signalClient = null
    this.peer = null
  }

  connectSignaling = async (onRecvMessage, onChannelStateChange) => {
    // Hook up to a broadcast channel (local browser API)
    this.signaling = new BroadcastChannel("messenger")

    // This should replace BroadcastChannel (pretty soon)
    this.signalClient = new SignalClient()
    await this.signalClient.connect()

    // supports only 1 other peer, for now
    this.peer = new PeerConnection(this.signaling, onRecvMessage, onChannelStateChange)
  }

  closeSignaling = () => {
    this.close()

    if (this.signaling) {
      this.signaling.close()
    }

    this.signaling = null

    if (this.signalClient) {
      this.signalClient.close()
    }

    this.signalClient = null
  }

  connect = async () => {
    await this.peer.connect()
  }

  close = () => {
    if (this.peer) {
      this.peer.close()
      this.peer = null
    }
  }

  sendData = (data) => {
    if (!this.peer) {
      console.log('cannot send (no connection)')
      return
    }

    this.peer.sendData(data)
  }

  ping = () => {
    this.signalClient.sendPing()
  }

}

export default Messenger
