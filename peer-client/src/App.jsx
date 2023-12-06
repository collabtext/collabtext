/**
 * A simple messenger app
 * 
 * Allows sending messages between multiple browser windows
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import Messenger from './messenger'
import Toolbar from './Toolbar'
import TextEditor from './TextEditor'
import ChannelState from './ChannelState'

const App = () => {
  const [doc, setDoc] = useState("")
  const [sendChannelState, setSendChannelState] = useState("no peerconnection")
  const [recvChannelState, setRecvChannelState] = useState("no peerconnection")

  const handleRecv = useCallback(msg => {
    setDoc(msg)
  }, [])

  const handleChannelStateChange = useCallback((sendChannelState, recvChannelState) => {
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
    messenger.current.sendData(doc)
  }

  const isConnected = sendChannelState === "open" || recvChannelState === "open"

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
        doc={doc}
        handleChange={e => setDoc(e.target.value)}
      />
      <ChannelState
        sendChannelState={sendChannelState}
        recvChannelState={recvChannelState}
      />
    </div>
  )
}

export default App
