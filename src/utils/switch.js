
/**
 * Toggles a switch, updates switches array accordingly
 * @param socket - socket.io connection
 * @param {string} sn - The serial number of the switch to toggle
 * @param {object} sw - The new state of the switch
 * @returns {undefined}
 */
async function toggle(socket, sn, sw){
  socket.emit('toggleSwitch', sn, res => {
    if(sw?.state)
      sw.state = res.BinaryState == 'Error' ? 'Error' : parseInt(res.BinaryState)
  })
}

export { toggle }