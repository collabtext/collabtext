import PropTypes from 'prop-types'

const placeholder = "Connect and enter some text" +
                    "\n\nChanges are synchronized to other peers"

const TextEditor = ({ docStr, handleChange, isDisabled, textArea }) => {
  return (
    <textarea
      value={docStr}
      onChange={handleChange}
      rows={10}
      cols={50}
      placeholder={placeholder}
      disabled={isDisabled}
      ref={textArea}
      className="w-full h-fit italic font-semibold font-medium text-lg text-zinc-300 text-slate-200 h-32 p-2 bg-slate-900 border-8 border-solid rounded focus:outline-none border-white"
    />
  )
}

TextEditor.propTypes = {
  docStr: PropTypes.string.isRequired,
  handleChange: PropTypes.func.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  textArea: PropTypes.object.isRequired,
}

export default TextEditor
