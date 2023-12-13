import PropTypes from 'prop-types'

const ChannelState = ({ sendChannelState, recvChannelState, remoteId }) => {
  return (
    <div>
      <div>Peer ID: {remoteId ?? "none"}</div>
      <div>SendChannel: {sendChannelState}</div>
      <div>RecvChannel: {recvChannelState}</div>
    </div>
  )
}

ChannelState.propTypes = {
  sendChannelState: PropTypes.string.isRequired,
  recvChannelState: PropTypes.string.isRequired,
  remoteId: PropTypes.number.isRequired,
}

const ChannelStates = ({ userId, conns }) => {
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
