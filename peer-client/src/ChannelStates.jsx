import PropTypes from 'prop-types'

const ChannelState = ({ sendChannelState, recvChannelState, remoteId, reconnect }) => {
  return (
    <div>
    <div className="border p-2 border-gray-600 rounded mb-2 bg-slate-200">
      Peer ID: {remoteId ?? "none"}
    </div>
    <div className="border p-2 border-gray-600 rounded mb-2 bg-slate-200">
      SendChannel: {sendChannelState}
    </div>
    <div className="border p-2 border-gray-600 rounded mb-2 bg-slate-200">
      RecvChannel: {recvChannelState}
    </div>
    <button onClick={reconnect} className='bg-blue-500 hover:bg-blue-700 rounded text-white font-bold py-2 px-4'>Reconnect</button>
    
  </div>
  
  )
}

ChannelState.propTypes = {
  sendChannelState: PropTypes.string.isRequired,
  recvChannelState: PropTypes.string.isRequired,
  remoteId: PropTypes.number.isRequired,
  reconnect: PropTypes.func.isRequired,
}

const ChannelStates = ({ userId, conns }) => {
  const reconnect = (conn) => async () => {
    //
    // TODO: This technique of reconnecting is very unreliable,
    // because we are not able to wait for the close to finish...
    //
    // A quick fix, use a timeout
    conn.close()
    setTimeout(async () => await conn.connect(), 1000)
  }

  return (
    <div>
      <div className='border p-2 border-gray-600 rounded mb-2 bg-slate-200 mt-2'>Your ID: {userId ?? "none"}</div>
      <div>
        {conns.map(conn => (
          <div key={conn.remoteId}>
            <ChannelState
              sendChannelState={conn.getReadyState()[0]}
              recvChannelState={conn.getReadyState()[1]}
              remoteId={conn.remoteId}
              reconnect={reconnect(conn)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

ChannelStates.propTypes = {
  userId: PropTypes.number,
  conns: PropTypes.array.isRequired,
}

export default ChannelStates
