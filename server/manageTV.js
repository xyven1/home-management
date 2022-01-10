import axios from 'axios'


var prevState = 0
var state = 0
var interval = null

function start() {
  if(interval) return
  interval = setInterval(async () => {
    await axios.get('http://10.200.10.128:8001/api/v2/', {timeout: 900 }).then(res => {
      state = ({on: 1, standby: 0})[res.data.device.PowerState]
    }).catch(err => {
      if(err.code == 'ECONNABORTED')
        state = 0
      if(err.code == "ECONNREFUSED")
        state = 1
    })
    if(state != prevState) {
      console.log("TV state changed to:", state ? "down" : "up")
      axios.post('http://10.200.10.35', state ? "down" : "up").catch(err => console.error(err))
      prevState = state
    }
  }, 1000)
}

function stop() {
  clearInterval(interval)
  interval = null
}

export default {
  start,
  stop
}