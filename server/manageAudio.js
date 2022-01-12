import axios from 'axios'

function sendCmd(cmd) {
  return axios.post('http://10.200.10.63/YamahaRemoteControl/ctrl', cmd)
}

export default io => {
  io.on('connection', socket => {
    socket.on('getAudioInput', (callback = ()=>{}) => {
      sendCmd('<YAMAHA_AV cmd="GET"><Main_Zone><Input><Input_Sel>GetParam</Input_Sel></Input></Main_Zone></YAMAHA_AV>').then(res => {
        callback(res.data.match(/<Input_Sel>(.*)<\/Input_Sel>/)[1])
      })
    })
    socket.on('changeInput', (input, callback = ()=>{}) => {
      sendCmd(`<YAMAHA_AV cmd="PUT"><Main_Zone><Input><Input_Sel>${input}</Input_Sel></Input></Main_Zone></YAMAHA_AV>`).then(res => {
        callback(res.data)
      })
    })
    socket.on('getAudioVolume', (callback = ()=>{}) => {
      sendCmd('<YAMAHA_AV cmd="GET"><Main_Zone><Volume><Lvl>GetParam</Lvl></Volume></Main_Zone></YAMAHA_AV>').then(res => {
        callback(res.data.match(/<Val>(.*)<\/Val>/)[1])
      })
    })
    socket.on('changeVolume', (volume, callback = ()=>{}) => {
      sendCmd(`<YAMAHA_AV cmd="PUT"><Main_Zone><Volume><Lvl><Val>${volume}</Val><Exp>1</Exp><Unit>dB</Unit></Lvl></Volume></Main_Zone></YAMAHA_AV>`).then(res => {
        callback(res.data)
      })
    })
  })
}