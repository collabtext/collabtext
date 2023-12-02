/**
 * A simple messenger app
 * 
 * Allows sending messages between multiple browser windows
 */

import React, { useEffect, useState } from 'react'

import Messenger from './messenger'

function App() {
  const [messenger, setMessenger] = useState(null)
  const [msg, setMsg] = useState("")
  const [inbox, setInbox] = useState([""])
  const [sendChannelState, setSendChannelState] = useState("")
  const [recvChannelState, setRecvChannelState] = useState("")

  // Note: Issue with BroadcastChannel init, cleanup doesn't work properly
  // This issue is related to React's strict mode, which means that
  // useEffect hooks will be called twice (in development)
  // Fixed by disabling strict mode...
  useEffect(() => {
    console.log("Opening a signaling channel")
    setMessenger(new Messenger(handleRecv, handleChannelStateChange))

    return () => {
      if (messenger) {
        console.log("Closing the signaling channel")
        messenger.closeSignaling()
        setMessenger(null)
      } else {
        console.log("Skipping cleanup (messenger is null)")
      }
    }
  }, [])

  const handleConnect = async () => {
    console.log('Pressed connect...')
    await messenger.connect()
  }

  const handleClose = () => {
    messenger.close()
  }

  const handleSend = () => {
    messenger.sendData(msg)
    setMsg("")
  }

  const handleRecv = (msg) => {
    //setInbox(inbox.concat(msg))
    setInbox([msg, ...inbox])
  }

  const getInboxAsString = () => {
    return inbox.join("\n\n")
  }

  const handleChannelStateChange = (sendChannelState, recvChannelState) => {
    setSendChannelState(sendChannelState)
    setRecvChannelState(recvChannelState)
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
