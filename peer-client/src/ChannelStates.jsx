import PropTypes from 'prop-types'

const ChannelState = ({ sendChannelState, recvChannelState, remoteId, reconnect }) => {
  return (
    <div>
      <div>Peer ID: {remoteId ?? "none"}</div>
      <div>SendChannel: {sendChannelState}</div>
      <div>RecvChannel: {recvChannelState}</div>
      <div><button onClick={reconnect}>Reconnect</button></div>
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
      <div>Your ID: {userId ?? "none"}</div>
      <br />
      <div>
        {conns.map(conn => (
          <div key={conn.remoteId}>
            <ChannelState
              sendChannelState={conn.getReadyState()[0]}
              recvChannelState={conn.getReadyState()[1]}
              remoteId={conn.remoteId}
              reconnect={reconnect(conn)}
            />
            <br />
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
