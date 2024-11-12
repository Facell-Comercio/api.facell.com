
exports.calcular = (req, res)=>{
    try {
        const { ciclo, metas } = req.body || {}
        if(!ciclo) throw new Error("Preencha o ciclo de pagamento!")
        if(!metas || metas.length === 0) throw new Error("Nenhuma meta foi recebida para cálculo")
        
        
        let result = [
            {
                id_cargo: 1,
                ciclo: '', ref: '',
            }
        ]

        res.status(200).json({})
    } catch (error) {
        res.status(400).json({message: error.message})
    }
}