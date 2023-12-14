import PropTypes from 'prop-types'

const Toolbar = ({ isConnected, handleConnect, handleClose, handleSync }) => {
  return (
    <div>
      <ConnectBtn
        isConnected={isConnected}
        handleConnect={async () => await handleConnect()}
        handleClose={() => handleClose()}
      />
      <SyncBtn
        isConnected={isConnected}
        handleSync={() => handleSync()}
      />
    </div>
  )
}

Toolbar.propTypes = {
  isConnected: PropTypes.bool.isRequired,
  handleConnect: PropTypes.func.isRequired,
  handleClose: PropTypes.func.isRequired,
  handleSync: PropTypes.func.isRequired,
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

export const SyncBtn = ({ isConnected, handleSync }) => {
  return (
    <button disabled={!isConnected} onClick={() => handleSync()}>Sync</button>
  )
}

SyncBtn.propTypes = {
  isConnected: PropTypes.bool.isRequired,
  handleSync: PropTypes.func.isRequired,
}
