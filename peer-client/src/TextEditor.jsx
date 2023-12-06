import PropTypes from 'prop-types'

const placeholder = "Open two windows, connect, enter some text and press send" +
                    "\n\nOnly one side needs to press connect"

const TextEditor = ({ doc, handleChange }) => {
  return (
    <textarea
      value={doc}
      onChange={handleChange}
      rows={10}
      cols={50}
      placeholder={placeholder}
    />
  )
}

TextEditor.propTypes = {
  doc: PropTypes.string.isRequired,
  handleChange: PropTypes.func.isRequired,
}

export default TextEditor
