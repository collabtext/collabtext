import PropTypes from 'prop-types'

const Toolbar = ({ isConnected, handleConnect, handleClose, handleSend }) => {
  return (
    <div>
      <ConnectBtn
        isConnected={isConnected}
        handleConnect={async () => await handleConnect()}
        handleClose={() => handleClose()}
      >
        Connect
      </ConnectBtn>
      <SendBtn
        isConnected={isConnected}
        handleSend={() => handleSend()}
      >
        Send
      </SendBtn>
    </div>
  )
}

Toolbar.propTypes = {
  isConnected: PropTypes.bool.isRequired,
  handleConnect: PropTypes.func.isRequired,
  handleClose: PropTypes.func.isRequired,
  handleSend: PropTypes.func.isRequired,
}

export default Toolbar

export const ConnectBtn = ({ isConnected, handleConnect, handleClose }) => {
  if (isConnected) {
    return (
      <button onClick={() => handleClose()}>Close</button>
    )
  }

  return (
    <button onClick={async () => await handleConnect()}>Connect</button>
  )
}

ConnectBtn.propTypes = {
  isConnected: PropTypes.bool.isRequired,
  handleConnect: PropTypes.func.isRequired,
  handleClose: PropTypes.func.isRequired,
}

export const SendBtn = ({ isConnected, handleSend }) => {
  return (
    <button disabled={!isConnected} onClick={() => handleSend()}>Send</button>
  )
}

SendBtn.propTypes = {
  isConnected: PropTypes.bool.isRequired,
  handleSend: PropTypes.func.isRequired,
}
