import PeerConnection from "./peerConnection"
import SignalClient from "./signalClient"

class Messenger {
  constructor(onRecvMessage, onChannelStateChange) {
    this.signaling = new BroadcastChannel("messenger")

    // This should replace BroadcastChannel (pretty soon)
    this.signalClient = new SignalClient()
    this.signalClient.connect()

    // supports only 1 other peer, for now
    console.log("Creating a peerconnection")
    this.peer = new PeerConnection(this.signaling, onRecvMessage, onChannelStateChange)
  }

  closeSignaling = () => {
    this.signaling.close()
    this.signaling = null

    this.signalClient.close()
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
