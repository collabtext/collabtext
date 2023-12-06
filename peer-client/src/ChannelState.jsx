import PropTypes from 'prop-types'

const ChannelState = ({ sendChannelState, recvChannelState }) => {
  return (
    <div>
      <div>SendChannel: {sendChannelState}</div>
      <div>RecvChannel: {recvChannelState}</div>
    </div>
  )
}

ChannelState.propTypes = {
  sendChannelState: PropTypes.string.isRequired,
  recvChannelState: PropTypes.string.isRequired,
}

export default ChannelState
