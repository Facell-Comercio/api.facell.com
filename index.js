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
    origin: ["http://localhost", "https://app.facell.com"],
        methods: ["GET","POST","PUT","DELETE"],
}))

app.use(express.static(path.join(__dirname, "public/")));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

const authRouter = require('./src/routes/authRouter')
const uploadRouter = require('./src/routes/uploadRouter')
const financeiroRouter = require('./src/routes/financeiro/financeiroRouter')

// const datasysRouter = require('./src/router/datasys/datasys')
// const timRouter = require('./src/router/tim/router')
// const esteiraRouter = require('./src/router/esteira/esteiraRouter')
// const facellRouter = require('./src/router/facell/facellRouter')
// const configureChatModule = require('./src/realtime/chat')

app.use('/auth', authRouter)
app.use('/upload', uploadRouter)
app.use('/financeiro', financeiroRouter)

// app.use('/datasys', datasysRouter)
// app.use('/comissao-tim', timRouter)
// app.use('/tim', timRouter)
// app.use('/esteira', esteiraRouter)
// app.use('/facell', facellRouter)

app.get('/', (req, res)=>{
    res.status(200).json({msg: 'Sucesso!'})
})

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