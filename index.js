const http = require('http')
const path = require('path')

const express = require('express')
const cors = require('cors')
const socketIo = require('socket.io');

require('./mysql')

require('dotenv').config()

// Inicia os cronjobs
// require('./src/jobs/index')

app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: ["http://localhost:5173","http://localhost", "https://app.facell.com"],
        methods: ["GET","POST","PUT","DELETE"],
}))

app.use(express.static(path.join(__dirname, "public/")));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
// const configureSocketModule = require('./src/socket/socket')

const router = require('./src/routes/router')
app.use(router)

const server = http.createServer(app)

const PORTA = 7000
server.listen(PORTA, () => {
    console.log('Backend Datasys is running... na porta '+PORTA)
})
// const io = socketIo(server, {
//     cors: {
//         origin: ["http://localhost"],
//         methods: ["GET","POST"],
//     }
// });
// configureChatModule(io)