const router = require('express').Router()

const authRouter = require('./authRouter')
const uploadRouter = require('./uploadRouter')
const financeiroRouter = require('./financeiro/financeiroRouter')
const grupoEconomico = require('./grupoEconomico')

// const datasysRouter = require('./datasys/datasys')
// const timRouter = require('./tim/router')
// const esteiraRouter = require('./esteira/esteiraRouter')
// const facellRouter = require('./facell/facellRouter')

app.use('/auth', authRouter)
app.use('/upload', uploadRouter)
app.use('/financeiro', financeiroRouter)
app.use('/grupo_economico', grupoEconomico)

// app.use('/datasys', datasysRouter)
// app.use('/comissao-tim', timRouter)
// app.use('/tim', timRouter)
// app.use('/esteira', esteiraRouter)
// app.use('/facell', facellRouter)

app.get('/', (req, res)=>{
    res.status(200).json({msg: 'Sucesso!'})
})

module.exports = router