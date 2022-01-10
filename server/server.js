import express from 'express'
import cors from 'cors'
import compression from 'compression'
import path from 'path'
import http from 'http'
import { Server } from 'socket.io'
import manageTV from './manageTV.js'
import manageLights from './manageLights.js'
import manageAudio from './manageAudio.js'

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

//middleware
app.use(cors())
app.use(compression())
app.use(express.static('dist'))

//serves static files in dist
app.get('/', (req, res) => {
  res.sendFile(path.join(path.resolve(), '/dist/index.html'))
})

//web socket
io.on('connection', (socket) => {
  console.log('a user connected:', socket.id)
  socket.on('disconnect', (reason) => {
    console.log('disconnecting:', socket.id, "because: ", reason)
  })
})

//initilize server
server.listen(process.env.SERVER_PORT, () => {
  console.log(`app listening at http://localhost:${process.env.SERVER_PORT}`)
})

//manage lights
manageLights(io)

//manage audio
manageAudio(io)

//manage tv
manageTV.start()