/**
 * A collaborative text editor
 *
 * Allows editing a shared text file among multiple users
 */

import { useCallback, useLayoutEffect, useRef, useState } from 'react'

import { RemoteOp, RGADoc } from "@collabtext/lib/src/crdt"
import SignalClient from "./signalClient"
import PeerConnection from "./peerConnection"

import Toolbar from "./Toolbar"
import TextEditor from "./TextEditor"
import ChannelStates from "./ChannelStates"

/**
 * URL of the WebSocket server (set at .env)
 */
const WS_URL = import.meta.env.VITE_WS_URL

/**
 * Whether the user can edit even while offline
 */
const ENABLE_OFFLINE_EDITING = true

/**
 * Whether to sync after every keystroke, or only when a button is pushed
 */
const ENABLE_REALTIME_EDITING = true

/**
 * Used for preserving cursor position after controlled updates
 *
 * Controlled updates are used to apply received remote operations.
 * Their side-effect is that the cursor jumps at the end of the document.
 * To prevent that, the cursor position must be updated manually.
 *
 * See the handleRecv callback.
 *
 * Ref: https://github.com/Atri-Labs/til/blob/main/react/controlled-input.md
 */
const useSetCursor = () => {
  const cursorFn = useRef(null)

  useLayoutEffect(() => {
    if (cursorFn.current !== null) {
      cursorFn.current()
      cursorFn.current = null
    }
  })

  return (fn) => {
    cursorFn.current = fn
  }
}

const App = () => {
  // The document
  const doc = useRef(null)
  const [docStr, setDocStr] = useState("")

  // Network status
  // Some of these are mutable objects, so they cannot be stored in React's state
  // The underlying cause is that the underlying browser API (RTCPeerConnection)
  // is represented by mutable objects
  const signalClient = useRef(null)
  const [userId, setUserId] = useState(null)
  const [peers, setPeers] = useState([])
  const conns = useRef([])

  // Used for preserving cursor position
  const setCursor = useSetCursor()
  const textArea = useRef(null)

  const [, setRenderCounter] = useState(0)

  // console.log("Rendering userId=", userId, "peers:", peers.map(p => p.toJSON()), "conns.current:", conns.current.map(c => c.toJSON()))

  const handleRecv = useCallback(msg => {
    if (msg.type === "text-editing-ops" || msg.type === "text-editing-history") {
      // Log this event
      if (msg.type === "text-editing-ops") {
        console.log('Received text editing ops:', msg.ops)
      } else {
        console.log('Received text editing history:', msg.ops)
      }

      // Save the current cursor position
      const currIndex = textArea.current.selectionStart
      const currId = doc.current.getIdOf(currIndex)

      // Apply received ops
      const parsedOps = msg.ops.map(op => RemoteOp.fromJSON(op))
      const changed = doc.current.applyRemoteOps(parsedOps)
      if (changed) {
        // Update the document
        setDocStr(doc.current.toString())

        if (currId) {
          setCursor(() => {
            // Compute and set the new cursor position
            const newIndex = doc.current.getIndexOf(currId)
            textArea.current.selectionStart = newIndex
            textArea.current.selectionEnd = newIndex
          })
        }
      }
    }
  }, [setCursor])

  const handleChannelStateChange = useCallback((peer, sendChannelState, recvChannelState) => {
    const isOpen = sendChannelState === "open" || recvChannelState === "open"
    if (isOpen) {
      // Opened a new direct connection to a peer

      // TODO: Sync initial states (properly)...
      //
      // Version 1: Send the entire local history
      // (the recipient ignores operations he/she already has)
      const conn = conns.current.find(c => c.remoteId === peer.id)
      const ops = doc.current
        .getHistory()
        .map(op => op.toJSON())
      sendFragments(ops, (fragment) => {
        conn.send({
          type: "text-editing-history",
          ops: fragment
        })
      })
    }

    // A trick... force a rerendering
    setRenderCounter(count => count + 1)
  }, [])

  // useEffect(() => {
  //   // TODO: Close connections on exit
  //   // Close all connections on exit
  //   return () => {
  //     if (signalClient.current !== null) {
  //       console.log("Exiting --> closing the signaling channel")
  //       close()
  //     }
  //   }
  // }, [])

  const connectSignaling = async (url, onRecvMessage, onChannelStateChange) => {
    signalClient.current = new SignalClient()

    // Event handlers
    const handlers = {
      onWelcome: async (id, peerList) => {
        console.log("Welcome: userId:", id, "peers:", peerList.map(p => p.toJSON()))

        // Save the id
        setUserId(id)

        // Create a new document, if one doesn't exist
        if (!doc.current) {
          doc.current = new RGADoc(id)
          doc.current.diffAndPatch(docStr)
        }

        // Prepare to connect
        const connList = []
        peerList.forEach(peer => {
          // Create a connection object
          const conn = new PeerConnection(
            id, peer.id,
            signalClient.current.send,
            onRecvMessage,
            (sendChannelState, recvChannelState) => {
              onChannelStateChange(peer, sendChannelState, recvChannelState)
            }
          )

          connList.push(conn)
        })

        // Add to the list
        setPeers(peerState => peerState.concat(peerList))
        conns.current = conns.current.concat(connList)

        // Connect to all
        const promises = []
        connList.forEach(conn => {
          promises.push(conn.connect())
        })
        await Promise.all(promises)

        // Note: syncing is done on channel open
        // ...at handleChannelStateChange
      },
      onJoin: async (localId, peer) => {
        console.log("Join: peer:", peer)

        // Create a connection object
        const conn = new PeerConnection(
          localId, peer.id,
          signalClient.current.send,
          onRecvMessage,
          (sendChannelState, recvChannelState) => {
            onChannelStateChange(peer, sendChannelState, recvChannelState)
          }
        )

        // Add to our list (but do not connect)
        // The joining host is expected to initiate the connection
        setPeers(peerState => peerState.concat(peer))
        conns.current.push(conn)
      },
      onLeave: async (peer) => {
        console.log("Leave: peer:", peer)

        // Find the connection object
        const conn = conns.current.find(c => c.remoteId === peer.id)

        // Close
        setPeers(peerState => peerState.filter(p => p.id !== peer.id))
        conns.current = conns.current.filter(c => c.remoteId !== peer.id)
        if (conn) {
          conn.close()
        }
      },
      onWebRTC: async (msg) => {
        // Forward the message to a connection object
        const fromId = Number.parseInt(msg.from)
        const conn = conns.current.find(c => c.remoteId === fromId)

        if (conn) {
          conn.onSignal(msg)
        } else {
          console.error(`Received a signal from an unknown host ${fromId}:`, msg)
        }
      },
      onSignalClose: async () => {
        closePeerConnections()

        signalClient.current = null
        setUserId(null)
      },
    }

    // Connect to a signaling server
    console.log(`Connecting to ${url}`)
    await signalClient.current.connect(url, handlers)
  }

  const close = () => {
    closePeerConnections()

    if (signalClient.current) {
      signalClient.current.close()
    }

    signalClient.current = null
    setUserId(null)
  }

  const closePeerConnections = () => {
    for (const conn of conns.current) {
      if (!conn) {
        continue
      }

      console.log(`closing connection to ${conn.remoteId}...`)
      conn.close()
    }

    setPeers([])
    conns.current = []
  }

  const broadcast = (json) => {
    for (const peer of peers) {
      const conn = conns.current.find(c => c.remoteId === peer.id)
      if (!conn || !conn.isReady()) {
        console.log(`cannot send to ${peer.id} (no connection)`)
        continue
      }

      conn.send(json)
    }
  }

  const handleConnect = async () => {
    console.log('Pressed connect...')
    await connectSignaling(WS_URL, handleRecv, handleChannelStateChange)
  }

  const handleClose = () => {
    console.log('Pressed close...')
    close()
  }

  const sendFragments = (ops, sendFn) => {
    // Fixes an issue with sending too many ops at once
    // Splits a list of ops into smaller fragments (1000 ops each)
    // Does not consider buffer size
    const FRAGMENT_OPS = 1000
    let start = 0
    while (start < ops.length) {
      const end = Math.min(start + FRAGMENT_OPS, ops.length)
      const slice = ops.slice(start, end)

      sendFn(slice)

      start = end
    }
  }

  const handleSync = (newDocStr) => {
    if (!doc.current) {
      // Skip this update
      // Waiting for initialization
      return
    }

    // Compute a list of changes
    const ops = doc.current
      .diffAndPatch(newDocStr)
      .map(op => op.toJSON())

    // Broadcast
    sendFragments(ops, (fragment) => {
      console.log('Sending text editing ops:', fragment)
      broadcast({
        type: "text-editing-ops",
        ops: fragment
      })
    })
  }

  const handleChange = (e) => {
    const newDocStr = e.target.value
    setDocStr(newDocStr)

    if (ENABLE_REALTIME_EDITING) {
      handleSync(newDocStr)
    }
  }

  const isConnected = !!signalClient.current && signalClient.current.isReady()
  const canEdit = ENABLE_OFFLINE_EDITING || isConnected

  return (
    <div className="flex-col border-8 border-double border-grey-400 bg-slate-700">
      <div className='flex flex-row justify-around border-2 border-solid m-2'>
        <h1 className="text-4xl text-lime-200 font-bold italic m-2">CollabText</h1>
      </div>
      <div className='flex flex-row'>
        <div className="flex-grow m-4">
          <TextEditor
            docStr={docStr}
            handleChange={handleChange}
            isDisabled={!canEdit}
            textArea={textArea}
          />
        </div>
        <div className=" m-4">
          <div className='mt-2'>
            <Toolbar
              isConnected={isConnected}
              handleConnect={async () => await handleConnect()}
              handleClose={() => handleClose()}
              handleSync={() => handleSync(docStr)}
            />
          </div>
          <ChannelStates
            userId={userId}
            conns={conns.current}
          />
        </div>
      </div>
    </div>
  )
}

export default App
