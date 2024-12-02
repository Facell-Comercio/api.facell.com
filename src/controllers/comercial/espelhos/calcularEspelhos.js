const calculoController = require('./calculo')

module.exports =  async (req, res) =>{
    try {
        const result = await calculoController.calcular(req.body)
        res.status(200).json(result)
    } catch (error) {
        res.status(400).json(error.message)
    }
}