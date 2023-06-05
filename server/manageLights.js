import fs from 'fs'
import upath from 'upath'
import Wemo from 'wemo-client'
import debounce from "debounce"

const dataPath = process.platform === "win32" ? "C:/ProgramData/home-management/" : "/var/cache/home-management/"

export default io => {
  var devices = {}

  //configs
  const wemo = new Wemo({
    discover_opts: {
      explicitSocketBind: true,
    },
    listen_interface: 'eno1'
  })
  
  //sync devices loaded onto server with devices stored on file
  const sync = debounce(()=>{
    fs.readFile(upath.join(dataPath, 'devices.json'), (err,data)=>{
      var parsed = JSON.parse(data)
      for (const [, client] of Object.entries(devices)) {
        let sw = parsed.find(sw=>sw.serialNumber==client.device.serialNumber)
        let device = {name: client.device.friendlyName, serialNumber: client.device.serialNumber, ip: client.device.host, port: client.device.port}
        if(sw) sw = device
        else parsed.push(device)
      }
      fs.writeFile(upath.join(dataPath, 'devices.json'), JSON.stringify(parsed,null, 2), (err)=>{if(err) console.error(err)})
    })
  }, 1000)
  
  //client managment
  function manageClient(deviceInfo){
    var client = wemo.client(deviceInfo)
    devices[client.device.serialNumber] = client
  
    client.on('error', err => {
      console.error('Client error: %s', err)
    })
  
    client.on('binaryState', value =>{
      console.log('statechange', client.device.friendlyName, value)
      io.emit('stateChange', {serialNumber: client.device.serialNumber, state: parseInt(value)})
    })
  }
  
  //discovers wemo devices connected to network
  function discover() {
    wemo.discover(deviceInfo => {
      if(!deviceInfo) return
      console.log('Wemo Device Found: %j', deviceInfo.friendlyName)
      manageClient(deviceInfo)
      sync()
    })
  }
  
  //loads devices from devices.json
  function loadDevices(){
    fs.readFile(upath.join(dataPath, 'devices.json'), (err,data)=>{
      var parsed = JSON.parse(data)
      parsed.forEach(sw => {
        wemo.load(`http://${sw.ip}:${sw.port}/setup.xml`).then(deviceInfo=>{
          console.log('Loaded Device: %j', deviceInfo.friendlyName)
          manageClient(deviceInfo)
        }).catch(err=>{
          console.error('Failed to load device: %s', err)
        })
      })
    })
  }
  
  //load all stored devices
  loadDevices()
  
  //repeated discover run every 10 seconds
  setInterval(discover, 10000)
  
  io.on('connection', (socket) => {
    //returns switches from devices object to a callback function
    socket.on('getSwitches', (callback = ()=>{}) => {
      console.log('getting switches')
      callback(Object.entries(devices).map(([, device]) => ({
        name: device.device.friendlyName,
        serialNumber: device.device.serialNumber
      })))
    })

    //returns parsed array containing data for svg, containing associations between map regions and serial number of switch
    socket.on('getSvg', (callback = ()=>{}) => {
      console.log('getting svg')
      fs.readFile('./svg.json', (err,data)=>{
        callback(JSON.parse(data))
      })
    })

    //returns the state of a switch given a serial number
    const getSwitch  = (serialNumber, callback = ()=>{}) => {
      console.log('getting switch state:', serialNumber)
      let device = devices[serialNumber]
      if(device)
        device.getBinaryState().then(res=>{
          const state = {
            name: device.device.friendlyName,
            serialNumber,
            state: res
          }
          if(res.brightness)
            state.brightness = parseInt(res.brightness)
          callback(state)
      }).catch(err => callback({status: 'error', err}))
      else callback("device not found:" + serialNumber)
    }
    socket.on('getSwitch', getSwitch)

    //allows client to toggle switches using serial number
    socket.on('toggleSwitch', (serialNumber, callback = ()=>{}) => {
      console.log('Toggling switch with serial number: ' + serialNumber)
      io.emit('stateChange', {serialNumber: serialNumber, state: 2})
      let device = devices[serialNumber]
      if(device)
        device.getBinaryState().then((BinaryState) =>{
          device.setBinaryState(BinaryState == 1 ? 0 : 1).then(result =>{
            callback(result)
          }).catch(callback)
        }).catch(callback)
      else callback("Device not found")
    })

    //allows client to set switch state using serial number
    socket.on('setSwitch', (serialNumber, state, callback = ()=>{}) => {
      state = parseInt(state)
      if(isNaN(state) || !({0:1,1:1})[state])
        return callback("invalid state")
      console.log('Setting switch with serial number: ' + serialNumber + ' to state: ' + state)
      let device = devices[serialNumber]
      if(device)
        device.setBinaryState(state).then(callback).catch(callback)
      else callback("Device not found")
    })

    //allows client to set brightness of a switch using serial number
    socket.on('setBrightness', (serialNumber, brightness, callback = ()=>{}) => {
      let device = devices[serialNumber]
      if(device)
        device.setBrightness(parseInt(brightness)).then((res)=>callback({
          brightness: parseInt(res.brightness),
          state: res.BinaryState
        })).catch(callback)
      else callback("Device not found")
    })

    //allows client to turn on or off all switches
    socket.on('setAllSwitches', (state, callback = ()=>{}) => {
      state = parseInt(state)
      if(isNaN(state) || !({0:1,1:1})[state])
        return callback("invalid state")
      console.log('Setting all switches to state: ' + state)
      for(const [, device] of Object.entries(devices))
        device.setBinaryState(state).then(callback).catch(callback)
    })

    //allows client to change serial number associated to a region
    socket.on('setSvg', (data, callback = ()=>{}) => {
      console.log('setting svg')
      fs.readFile('./svg.json', (err,fileData)=>{
        var parsed = JSON.parse(fileData)
        parsed.flatMap(r=>r.regions).find(r=>r.d == data.d).sn = data.sn
        fs.writeFile('./svg.json', JSON.stringify(parsed,null, 2), (err)=>{
          if(err) console.error(err)
          getSwitch(data.sn, callback)
        })
      })
    })
  })
}
