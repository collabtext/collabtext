/**
 * A collaborative text editor
 *
 * Allows editing a shared text file among multiple users
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { RemoteOp, RGADoc } from "@collabtext/lib/src/crdt"
import Messenger from './messenger'
import Toolbar from './Toolbar'
import TextEditor from './TextEditor'
import ChannelState from './ChannelState'

const App = () => {
  // The document
  const doc = useRef(null)
  const [docStr, setDocStr] = useState("")
  const [hostId, setHostId] = useState(null)

  // Network status
  const [sendChannelState, setSendChannelState] = useState("no peerconnection")
  const [recvChannelState, setRecvChannelState] = useState("no peerconnection")
  const isConnected = sendChannelState === "open" || recvChannelState === "open"

  const handleRecv = useCallback(msg => {
    msg = JSON.parse(msg)
    if (msg.type === "text-editing-ops") {
      console.log('Received text editing ops:', msg.ops)
      const parsedOps = msg.ops.map(op => RemoteOp.fromJSON(op))
      const changed = doc.current.applyRemoteOps(parsedOps)
      if (changed) {
        setDocStr(doc.current.toString())
      }
    }
  }, [])

  const handleChannelStateChange = useCallback((sendChannelState, recvChannelState) => {
    const isConn = sendChannelState === "open" || recvChannelState === "open"
    if (isConn) {
      // Opened a new direct connection to a peer

      // Obtain a host id
      // TODO: Host ID should be assigned by the signaling server
      const newHostId = Math.floor(100*Math.random())
      setHostId(newHostId)

      // Create a new local document instance
      // ...and bring it up-to-date with the other node
      //
      // TODO: Sync initial states...
      //
      // For now, we just reset the documents so that the initial states match
      doc.current = new RGADoc(newHostId)
      setDocStr("")
    }

    setSendChannelState(sendChannelState)
    setRecvChannelState(recvChannelState)
  }, [])

  // Messenger is mutable, so it cannot be stored in React's state
  // The underlying cause is that Messenger connects to a browser API
  // (RTCPeerConnection) which is represented by mutable objects
  const messenger = useRef(null)

  // Initialize a messenger (which also connects to a BroadcastChannel)
  //
  // Some of the extra complexity here is related to React's strict mode,
  // which means that useEffect hooks will be called twice (in development).
  // Hence, we will have two connect-close sequences (the first is redundant).
  // Later, this will be moved to an event handler, so having the extra security
  // against multiple invocations is a good thing.
  //
  // Relies on an ignore flag to cope with multiple invocations in-flight
  // https://react.dev/reference/react/useEffect#fetching-data-with-effects
  useEffect(() => {
    const initSignaling = async () => {
      if (messenger.current === null) {
        console.log("Opening a signaling channel")
        const ms = new Messenger()
        await ms.connectSignaling(handleRecv, handleChannelStateChange)

        if (ignore) {
          console.log("@useEffect: closing a *redundant* signaling channel")
          ms.closeSignaling()
        } else {
          console.log("@useEffect: setting messenger.current")
          messenger.current = ms
        }
      }
    }

    let ignore = false
    initSignaling()

    return () => {
      ignore = true

      if (messenger.current !== null) {
        console.log("Closing the signaling channel")
        messenger.current.closeSignaling()
        messenger.current = null
      } else {
        console.log("Skipping cleanup (messenger is null)")
      }
    }
  }, [handleRecv, handleChannelStateChange])

  const handleConnect = async () => {
    console.log('Pressed connect...')
    await messenger.current.connect()

    // try using the SignalClient
    messenger.current.ping()
  }

  const handleClose = () => {
    console.log('Pressed close...')
    messenger.current.close()
  }

  const handleSend = () => {
    const ops = doc.current.diffAndPatch(docStr)
    const opsJson = ops.map(op => op.toJSON())
    console.log('Sending text editing ops:', opsJson)
    sendOps(opsJson)
  }

  const sendOps = (ops) => {
    messenger.current.send({ type: "text-editing-ops", ops: ops })
  }

  return (
    <div>
      <Toolbar
        isConnected={isConnected}
        handleConnect={async () => await handleConnect()}
        handleClose={() => handleClose()}
        handleSend={() => handleSend()}
      />
      <div>New message:</div>
      <TextEditor
        doc={docStr}
        handleChange={e => setDocStr(e.target.value)}
      />
      <ChannelState
        sendChannelState={sendChannelState}
        recvChannelState={recvChannelState}
        hostId={hostId}
      />
    </div>
  )
}

export default App
