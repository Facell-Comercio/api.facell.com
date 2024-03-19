const router = require('express').Router()

const authRouter = require('./auth-router')
const uploadRouter = require('./upload-router')
const financeiroRouter = require('./financeiro/financeiro-router')
const grupoEconomico = require('./grupo-economico-router')
const filial = require('./filial-router')
const authMiddleware = require('../middlewares/authentication-middleware')

// const datasysRouter = require('./datasys/datasys')
// const timRouter = require('./tim/router')
// const esteiraRouter = require('./esteira/esteiraRouter')
// const facellRouter = require('./facell/facellRouter')

app.use('/auth', authRouter)

app.use(authMiddleware)

app.use('/upload', uploadRouter)
app.use('/financeiro', financeiroRouter)
app.use('/grupo-economico', grupoEconomico)
app.use('/filial', filial)

// app.use('/datasys', datasysRouter)
// app.use('/comissao-tim', timRouter)
// app.use('/tim', timRouter)
// app.use('/esteira', esteiraRouter)
// app.use('/facell', facellRouter)

app.get('/', (req, res)=>{
    res.status(200).json({msg: 'Sucesso!'})
})

module.exports = router