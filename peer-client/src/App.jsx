/**
 * A collaborative text editor
 *
 * Allows editing a shared text file among multiple users
 */

import { useCallback, useRef, useState } from 'react'

import { RemoteOp, RGADoc } from "@collabtext/lib/src/crdt"
import SignalClient from "./signalClient"
import PeerConnection from "./peerConnection"

import Toolbar from "./Toolbar"
import TextEditor from "./TextEditor"
import ChannelStates from "./ChannelStates"

/**
 * URL of the WebSocket server
 */
const WS_URL = "ws://localhost:4040/ws"

/**
 * Whether the user can edit even while offline
 */
const ENABLE_OFFLINE_EDITING = true

/**
 * Whether to sync after each key press, or only when a button is pushed
 */
const ENABLE_LIVE_EDITING = true

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

      // Apply received ops
      const parsedOps = msg.ops.map(op => RemoteOp.fromJSON(op))
      const changed = doc.current.applyRemoteOps(parsedOps)
      if (changed) {
        setDocStr(doc.current.toString())
      }
    }
  }, [])

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
      conn.send({
        type: "text-editing-history",
        ops: ops
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
        console.log("Welcome: userId:", id, "peers:", peerList)

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
    }

    // Connect to a signaling server
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
    for (const peer of peers) {
      const conn = conns.current.find(c => c.remoteId === peer.id)
      if (!conn) {
        continue
      }

      console.log(`closing connection to ${peer.id}...`)
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
    console.log('Sending text editing ops:', ops)
    broadcast({
      type: "text-editing-ops",
      ops: ops
    })
  }

  const handleChange = (e) => {
    const newDocStr = e.target.value
    setDocStr(newDocStr)

    if (ENABLE_LIVE_EDITING) {
      handleSync(newDocStr)
    }
  }

  const isConnected = !!signalClient.current && signalClient.current.isReady()
  const canEdit = ENABLE_OFFLINE_EDITING || isConnected

  return (
    <div>
      <Toolbar
        isConnected={isConnected}
        handleConnect={async () => await handleConnect()}
        handleClose={() => handleClose()}
        handleSync={() => handleSync(docStr)}
      />
      <div>Document:</div>
      <TextEditor
        docStr={docStr}
        handleChange={handleChange}
        isDisabled={!canEdit}
      />
      <ChannelStates
        userId={userId}
        conns={conns.current}
      />
    </div>
  )
}

export default App
