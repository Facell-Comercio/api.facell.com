const ENDPOINT = 'https://wsintegracaoclientes.datasys.online/clientes/ConsultasDatasys.asmx?WSDL'
const CONFIG = {
    headers: {'Content-Type':'application/soap+xml;charset=UTF-8'}
}

module.exports = {
    ENDPOINT, 
    CONFIG, 
}