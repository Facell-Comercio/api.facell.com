const rules = require('../layout/rules')
const ArquivoHeader = rules.ITAU.ArquivoHeader

const fields = {
    cnpj: '01663174466',
    agencia: 1234
}

function createHeader(fields:{cnpj, agencia}){
    
    ArquivoHeader.forEach(campo=>{
        const field = campo.field
        let value = fields[field]
        if(!value && campo.default == undefined){
            throw...
        }


    })
	
}