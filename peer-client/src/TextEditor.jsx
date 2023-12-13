import PropTypes from 'prop-types'

const placeholder = "Open two windows, connect, enter some text and press send" +
                    "\n\nOnly one side needs to press connect"

const TextEditor = ({ docStr, handleChange }) => {
  return (
    <textarea
      value={docStr}
      onChange={handleChange}
      rows={10}
      cols={50}
      placeholder={placeholder}
    />
  )
}

TextEditor.propTypes = {
  docStr: PropTypes.string.isRequired,
  handleChange: PropTypes.func.isRequired,
}

export default TextEditor
