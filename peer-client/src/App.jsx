/**
 * A collaborative text editor
 *
 * Allows editing a shared text file among multiple users
 */

import { useCallback, useRef, useState } from 'react'

import { RemoteOp, RGADoc } from "@collabtext/lib/src/crdt"
// import Messenger from './messenger'
import SignalClient from "./signalClient"
import PeerConnection from "./peerConnection"

import Toolbar from './Toolbar'
import TextEditor from './TextEditor'
import ChannelStates from './ChannelStates'

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
    if (msg.type === "text-editing-ops") {
      console.log('Received text editing ops:', msg.ops)
      const parsedOps = msg.ops.map(op => RemoteOp.fromJSON(op))
      const changed = doc.current.applyRemoteOps(parsedOps)
      if (changed) {
        setDocStr(doc.current.toString())
      }
    }
  }, [])

  const handleChannelStateChange = useCallback((peer, sendChannelState, recvChannelState) => {
    const isConn = sendChannelState === "open" || recvChannelState === "open"
    if (isConn) {
      // Opened a new direct connection to a peer

      //
      // TODO: Sync initial states...
      //
      // doc.current = new RGADoc(userId)
      // setDocStr("")
    } else {
      // An existing connection closed
    }

    // A trick... force a rerendering
    setRenderCounter(count => count + 1)
  }, [])

  // TODO: Close connections on exit
  // // Close all connections on exit
  // useEffect(() => {
  //   return () => {
  //     if (signalClient.current !== null) {
  //       console.log("Exiting --> closing the signaling channel")
  //       close()
  //     }
  //   }
  // }, [])

  const connectSignaling = async (onRecvMessage, onChannelStateChange) => {
    // Connect to a signaling server
    signalClient.current = new SignalClient()
    await signalClient.current.connect({
      onWelcome: async (id, peerList) => {
        console.log("Welcome: userId:", id, "peers:", peerList)

        // Save the id
        setUserId(id)

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

        //
        // TODO: DO INITIAL SYNCS WITH THE OTHER CLIENTS!
        //
        doc.current = new RGADoc(id)
        setDocStr("")
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
    })
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
    for (let i = 0; i < peers.length; i++) {
      const peer = peers[i]
      const conn = conns.current[i]

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

      if (!conn) {
        console.log(`cannot send to ${peer.id} (no connection)`)
        continue
      }

      conn.send(json)
    }
  }

  const handleConnect = async () => {
    console.log('Pressed connect...')
    await connectSignaling(handleRecv, handleChannelStateChange)
  }

  const handleClose = () => {
    console.log('Pressed close...')
    close()
  }

  const handleSend = () => {
    // Compute a list of changes
    const ops = doc.current
      .diffAndPatch(docStr)
      .map(op => op.toJSON())

    // Broadcast
    console.log('Sending text editing ops:', ops)
    broadcast({
      type: "text-editing-ops",
      ops: ops
    })
  }

  return (
    <div>
      <Toolbar
        isConnected={!!signalClient.current && signalClient.current.isReady()}
        handleConnect={async () => await handleConnect()}
        handleClose={() => handleClose()}
        handleSend={() => handleSend()}
      />
      <div>Document:</div>
      <TextEditor
        docStr={docStr}
        handleChange={e => setDocStr(e.target.value)}
      />
      <ChannelStates
        userId={userId}
        conns={conns.current}
      />
    </div>
  )
}

export default App
