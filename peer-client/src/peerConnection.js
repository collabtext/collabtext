/**
 * Simple messenger using a WebRTC datachannel
 * 
 * ADAPTED FROM AN EXAMPLE IN THE WEBRTC DOCS:
 * Live: https://webrtc.github.io/samples/src/content/datachannel/channel/
 * Code: https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/channel/js/main.js
 * 
 * Resources for learning WebRTC:
 * - https://web.dev/articles/webrtc-basics
 * - https://web.dev/articles/webrtc-infrastructure
 */
class PeerConnection {
  constructor(signaling, onRecvMessage, onChannelStateChange) {
    this.pc = null
    this.sendChannel = null
    this.recvChannel = null
    this.signaling = signaling
    this.signaling.onmessage = this.handleSignalingMessage
    this.onRecvMessage = onRecvMessage
    this.onChannelStateChange = onChannelStateChange
  }

  // TODO: Handling signaling (this method) should be moved to another class
  handleSignalingMessage = (e) => {
    switch (e.data.type) {
      case "offer":
        console.log("[signal] received an offer", e.data)
        this.handleOffer(e.data)
        break;
      case "answer":
        console.log("[signal] received an answer", e.data)
        this.handleAnswer(e.data)
        break;
      case "candidate":
        console.log("[signal] received a candidate", e.data)
        this.handleCandidate(e.data)
        break;
      // case "ready":
      //   // A second tab joined. Can proceed to connect...
      //   if (this.pc) {
      //     console.log("already in call, ignoring");
      //     return;
      //   }
      //   console.log("received a ready message")
      //   break;
      case "bye":
        console.log("[signal] received a bye message")
        if (this.pc) {
          this.close();
          console.log("closing")
        }
        break;
      default:
        console.log("unhandled", e);
        break;
    }
  }

  connect = async () => {
    this.pc = this.createPeerConnection()

    this.sendChannel = this.pc.createDataChannel("sendDataChannel")
    this.sendChannel.onmessage = this.onSendChannelMessageCallback
    this.sendChannel.onopen = this.onSendChannelStateChange
    this.sendChannel.onclose = this.onSendChannelStateChange

    const offer = await this.pc.createOffer()
    console.log("posting an offer...")
    this.signaling.postMessage({ type: "offer", sdp: offer.sdp })
    await this.pc.setLocalDescription(offer)
  }

  createPeerConnection = () => {
    const pc = new RTCPeerConnection()
    pc.onicecandidate = e => {
      console.log("@pc.onicecandidate")
      const message = {
        type: "candidate",
        candidate: null,
      }

      if (e.candidate) {
        message.candidate = e.candidate.candidate
        message.sdpMid = e.candidate.sdpMid
        message.sdpMLineIndex = e.candidate.sdpMLineIndex
      }

      this.signaling.postMessage(message)
    }

    return pc
  }

  close = () => {
    if (this.pc) {
      this.pc.close()
      this.pc = null
    }

    this.sendChannel = null
    this.recvChannel = null

    this.signaling.postMessage({ type: "bye" })
  }

  handleOffer = async (offer) => {
    if (this.pc) {
      console.error("existing peerconnection")
      return;
    }

    this.pc = this.createPeerConnection()
    this.pc.ondatachannel = this.receiveChannelCallback
    await this.pc.setRemoteDescription(offer)

    console.log('sending an answer')

    const answer = await this.pc.createAnswer()
    this.signaling.postMessage({ type: "answer", sdp: answer.sdp })
    await this.pc.setLocalDescription(answer)
  }

  handleAnswer = async (answer) => {
    if (!this.pc) {
        console.error("no peerconnection")
        return
      }

      console.log("handling an answer")

      await this.pc.setRemoteDescription(answer)
  }

  handleCandidate = async (candidate) => {
    if (!this.pc) {
        console.error("no peerconnection")
        return
      }

      if (!candidate.candidate) {
        await this.pc.addIceCandidate(null)
      } else {
        await this.pc.addIceCandidate(candidate)
      }
  }

  sendData = (data) => {
    if (this.sendChannel) {
      this.sendChannel.send(data)
    } else {
      this.recvChannel.send(data)
    }
  }

  receiveChannelCallback = (event) => {
    console.log("Receive Channel Callback")
    this.recvChannel = event.channel
    this.recvChannel.onmessage = this.onReceiveChannelMessageCallback
    this.recvChannel.onopen = this.onReceiveChannelStateChange
    this.recvChannel.onclose = this.onReceiveChannelStateChange
  }

  onReceiveChannelMessageCallback = (event) => {
    console.log("Received Message [recv chan]")
    this.onRecvMessage(event.data)
  }

  onSendChannelMessageCallback = (event) => {
    console.log("Received Message [send chan]")
    this.onRecvMessage(event.data)
  }

  onSendChannelStateChange = () => {
    const readyState = this.sendChannel?.readyState
    console.log("Send channel state is: " + readyState)
    if (readyState === "open") {
      // ...
    } else {
      // ...
    }

    this.informChannelStateChange()
  }

  onReceiveChannelStateChange = () => {
    const readyState = this.recvChannel?.readyState
    console.log(`Receive channel state is: ${readyState}`)
    if (readyState === "open") {
      // ...
    } else {
      // ...
    }

    this.informChannelStateChange()
  }

  informChannelStateChange = () => {
    let snd = "no peerconnection"
    if (this.pc && this.sendChannel) {
      snd = this.sendChannel.readyState
    }
  
    let rcv = "no peerconnection"
    if (this.pc && this.recvChannel) {
      rcv = this.recvChannel.readyState
    }

    if (this.onChannelStateChange) {
      this.onChannelStateChange(snd, rcv)
    }
  }

}

export default PeerConnection
