/**
 * A simple messenger app
 * 
 * Allows sending messages between multiple browser windows
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import Messenger from './messenger'

function App() {
  const [msg, setMsg] = useState("")
  const [inbox, setInbox] = useState([""])
  const [sendChannelState, setSendChannelState] = useState("no peerconnection")
  const [recvChannelState, setRecvChannelState] = useState("no peerconnection")

  const handleRecv = useCallback(msg => {
    setInbox(i => [msg, ...i])
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
    messenger.current.close()
  }

  const handleSend = () => {
    messenger.current.sendData(msg)
    setMsg("")
  }

  const getInboxAsString = () => {
    return inbox.join("\n\n")
  }

  const printChannelState = () => {
    return (
      <div>
        <div>SendChannel: {sendChannelState}</div>
        <div>RecvChannel: {recvChannelState}</div>
      </div>
    )
  }

  const placeholder = "Open two windows, connect, enter some text and press send" +
                      "\n\nOnly one side needs to press connect"

  return (
    <>
      <div>
        <button onClick={async () => await handleConnect()}>Connect</button>
        <button onClick={() => handleClose()}>Close</button>
        <button onClick={() => handleSend()}>Send</button>
        <div>New message:</div>
      </div>
      <div>
        <textarea
          value={msg}
          onChange={e => setMsg(e.target.value)}
          rows={10}
          cols={50}
          placeholder={placeholder}
        />
      </div>
      <div>Inbox:</div>
      <div>
        <textarea
          value={getInboxAsString()}
          rows={10}
          cols={50}
          readOnly
        />
      </div>
      {printChannelState()}
    </>
  )
}

export default App
