import PropTypes from "prop-types"

const Toolbar = ({ isConnected, handleConnect, handleClose, handleSync }) => {
  return (
    <div className="space-x-2">
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
      <button
        onClick={() => handleClose()}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Close
      </button>
    )
  }

  return (
    <button
      onClick={async () => await handleConnect()}
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    >
      Connect
    </button>
  )
}

ConnectBtn.propTypes = {
  isConnected: PropTypes.bool.isRequired,
  handleConnect: PropTypes.func.isRequired,
  handleClose: PropTypes.func.isRequired,
}

export const SyncBtn = ({ isConnected, handleSync }) => {
  return (
    <button
      disabled={!isConnected}
      onClick={() => handleSync()}
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    >
      Sync
    </button>
  )
}

SyncBtn.propTypes = {
  isConnected: PropTypes.bool.isRequired,
  handleSync: PropTypes.func.isRequired,
}
