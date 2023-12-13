/**
 * A wrapper around a WebRTC datachannel
 *
 * Adapter from an example in the WebRTC docs:
 * Live: https://webrtc.github.io/samples/src/content/datachannel/channel/
 * Code: https://github.com/webrtc/samples/blob/gh-pages/src/content/datachannel/channel/js/main.js
 *
 * Resources for learning WebRTC:
 * - https://web.dev/articles/webrtc-basics
 * - https://web.dev/articles/webrtc-infrastructure
 */
class PeerConnection {
  constructor(userId, remoteId, sendSignal, onRecvMessage, onChannelStateChange) {
    // Validation
    if (!userId) {
      throw new Error("Error: userId not given:", userId)
    }

    if (!remoteId) {
      throw new Error("Error: remoteId not given:", remoteId)
    }

    // Attributes
    this.userId = userId
    this.remoteId = remoteId
    this.sendSignal = sendSignal
    this.onRecvMessage = onRecvMessage
    this.onChannelStateChange = onChannelStateChange

    // Connection & channel
    this.pc = null
    this.sendChannel = null
    this.recvChannel = null
  }

  onSignal = (msg) => {
    const data = { ...msg, type: msg.subtype }
    switch (msg.subtype) {
      case "offer":
        // console.log("[pc/signal] received an offer", msg)
        this.handleOffer(data)
        break;
      case "answer":
        // console.log("[pc/signal] received an answer", msg)
        this.handleAnswer(data)
        break;
      case "candidate":
        // console.log("[pc/signal] received a candidate", msg)
        this.handleCandidate(data)
        break;
      case "bye":
        // console.log("[pc/signal] received a bye message")
        if (this.pc) {
          this.close();
          console.log("closing")
        }
        break;
      default:
        console.log("[signal] unhandled", msg);
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
    // console.log("posting an offer...")
    this.sendSignal({
      type: "webrtc",
      subtype: "offer",
      to: this.remoteId,
      from: this.userId,
      sdp: offer.sdp,
    })
    await this.pc.setLocalDescription(offer)
  }

  createPeerConnection = () => {
    const pc = new RTCPeerConnection()
    pc.onicecandidate = e => {
      const message = {
        type: "webrtc",
        subtype: "candidate",
        to: this.remoteId,
        from: this.userId,
        candidate: null,
      }

      if (e.candidate) {
        message.candidate = e.candidate.candidate
        message.sdpMid = e.candidate.sdpMid
        message.sdpMLineIndex = e.candidate.sdpMLineIndex
      }

      this.sendSignal(message)
    }

    return pc
  }

  close = () => {
    if (this.pc) {
      this.pc.close()
      this.pc = null

      // TODO: Would it be better to send this directly?
      this.sendSignal({
        type: "webrtc",
        subtype: "bye",
        to: this.remoteId,
        from: this.userId,
      })
    }

    this.sendChannel = null
    this.recvChannel = null

    // TODO: Reset attributes
  }

  handleOffer = async (offer) => {
    if (this.pc) {
      console.error("existing peerconnection")
      return;
    }

    this.pc = this.createPeerConnection()
    this.pc.ondatachannel = this.receiveChannelCallback
    await this.pc.setRemoteDescription(offer)

    // console.log('sending an answer')

    const answer = await this.pc.createAnswer()
    this.sendSignal({
      type: "webrtc",
      subtype: "answer",
      to: this.remoteId,
      from: this.userId,
      sdp: answer.sdp,
    })
    await this.pc.setLocalDescription(answer)
  }

  handleAnswer = async (answer) => {
    if (!this.pc) {
        console.error("no peerconnection")
        return
      }

      // console.log("handling an answer")

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

  send = (json) => {
    const data = JSON.stringify(json)

    if (this.sendChannel) {
      this.sendChannel.send(data)
    } else {
      this.recvChannel.send(data)
    }
  }

  receiveChannelCallback = (event) => {
    this.recvChannel = event.channel
    this.recvChannel.onmessage = this.onReceiveChannelMessageCallback
    this.recvChannel.onopen = this.onReceiveChannelStateChange
    this.recvChannel.onclose = this.onReceiveChannelStateChange
  }

  onReceiveChannelMessageCallback = (event) => {
    this.onRecvMessage(JSON.parse(event.data))
  }

  onSendChannelMessageCallback = (event) => {
    this.onRecvMessage(JSON.parse(event.data))
  }

  onSendChannelStateChange = () => {
    const readyState = this.sendChannel?.readyState
    if (readyState === "open") {
      // ...
    } else {
      // ...
    }

    this.informChannelStateChange()
  }

  onReceiveChannelStateChange = () => {
    const readyState = this.recvChannel?.readyState
    if (readyState === "open") {
      // ...
    } else {
      // ...
    }

    this.informChannelStateChange()
  }

  informChannelStateChange = () => {
  const [snd, rcv] = this.getReadyState()

    if (this.onChannelStateChange) {
      this.onChannelStateChange(snd, rcv)
    }
  }

  getReadyState = () => {
    let snd = "no peerconnection"
    if (this.pc && this.sendChannel) {
      snd = this.sendChannel.readyState
    }
  
    let rcv = "no peerconnection"
    if (this.pc && this.recvChannel) {
      rcv = this.recvChannel.readyState
    }

    return [snd, rcv]
  }

  toJSON = () => {
    return {
      userId: this.userId,
      remoteId: this.remoteId,
    }
  }
}

export default PeerConnection
