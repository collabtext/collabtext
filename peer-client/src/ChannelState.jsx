import PropTypes from 'prop-types'

const ChannelState = ({ sendChannelState, recvChannelState, hostId }) => {
  return (
    <div>
      <div>SendChannel: {sendChannelState}</div>
      <div>RecvChannel: {recvChannelState}</div>
      <div>HostID: {hostId ?? "none"}</div>
    </div>
  )
}

ChannelState.propTypes = {
  sendChannelState: PropTypes.string.isRequired,
  recvChannelState: PropTypes.string.isRequired,
  hostId: PropTypes.number,
}

export default ChannelState
