import PeerConnection from "./peerConnection";

class Messenger {
  constructor(onRecvMessage, onChannelStateChange) {
    this.signaling = new BroadcastChannel("messenger")

    // supports only 1 other peer, for now
    console.log("Creating a peerconnection")
    this.peer = new PeerConnection(this.signaling, onRecvMessage, onChannelStateChange)
  }

  closeSignaling = () => {
    this.signaling.close()
    this.signaling = null
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

}

export default Messenger
