const {db} = require('../../../../mysql');
const { checkUserDepartment } = require('../../../helpers/checkUserDepartment');
const { checkUserPermission } = require('../../../helpers/checkUserPermission');

function getAll(req){
    return new Promise(async(resolve, reject)=>{
        const {user} = req

        const {pagination, filters} = req.query || {};
        const {pageIndex, pageSize} = pagination || {pageIndex: 0, pageSize: 15};

        const offset = pageIndex > 0 ? pageSize * (pageIndex) : 0;
        // console.log(pageIndex, pageSize, offset)

        // Filtros
        var where = ` WHERE 1=1 `
        // Somente o Financeiro/Master podem ver todos
        if(!checkUserDepartment(req, 'FINANCEIRO') && !checkUserPermission(req, 'MASTER')){
            where += ` AND t.id_solicitante = '${user.id}' `
        }
        // console.log(filters)
        const {id, id_grupo_economico, id_status, tipo_data, range_data, descricao, nome_fornecedor, nome_user} = filters || {}
        if(id){
            where += ` AND t.id LIKE '${id}%' `
        }
        if(id_status && id_status !== 'all'){
            where += ` AND t.id_status LIKE '${id_status}%' `
        }
        if(descricao){
            where += ` AND t.descricao LIKE '%${descricao}%' `
        }
        if(tipo_data && range_data){
            const {from: data_de, to: data_ate} = range_data
            if(data_de && data_ate){
                where += ` AND t.${tipo_data} BETWEEN '${data_de.split('T')[0]}' AND '${data_ate.split('T')[0]}'  `
            }else{
                if(data_de){
                    where += ` AND t.${tipo_data} >= '${data_de.split('T')[0]}' `
                }
                if(data_ate){
                    where += ` AND t.${tipo_data} <= '${data_ate.split('T')[0]}' `
                }
            }
        }
        if(id_grupo_economico && id_grupo_economico !== 'all'){
            where += ` AND f.id_grupo_economico = '${id_grupo_economico}' `
        }
        // console.log(where)

        try {
            const [rowsTitulos] = await db.execute(`SELECT count(t.id) as total FROM fin_cp_titulos t LEFT JOIN filiais f ON f.id = t.id_filial ${where}`)
            const totalTitulos = rowsTitulos && rowsTitulos[0]['total'] || 0

            var query = `
            SELECT 
                t.id, s.status, t.created_at, t.data_vencimento, t.descricao, t.valor,
                f.nome as filial,
                forn.nome as fornecedor, u.nome as solicitante
            FROM 
                fin_cp_titulos t 
            LEFT JOIN 
                fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN 
                filiais f ON f.id = t.id_filial 
            LEFT JOIN 
                fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN 
                users u ON u.id = t.id_solicitante

            ${where}

            ORDER BY 
                t.created_at DESC 
            LIMIT ? OFFSET ?`;
            const params = [pageSize, offset]
            // console.log(query)
            // console.log(params)
            const [titulos] = await db.execute(query, params)

            const objResponse = {rows: titulos, pageCount: Math.ceil(totalTitulos / pageSize), rowCount: totalTitulos}
            // console.log('Fetched Titulos', titulos.length)
            // console.log(objResponse)
            resolve(objResponse)
        } catch (error) {
            reject(error)
        }
    })
}

function getOne(req){
    return new Promise(async(resolve, reject)=>{
        const {id} = req.params
        // console.log(req.params)
        try {
            const [rowTitulo] = await db.execute(`
            SELECT t.*, st.status,
                fo.nome as nome_fornecedor, 
                fo.cnpj as cnpj_fornecedor,
                CONCAT(pc.codigo, ' - ', pc.descricao) as plano_contas
            FROM fin_cp_titulos t 
            INNER JOIN fin_cp_status st ON st.id = t.id_status
            LEFT JOIN 
                fin_fornecedores fo ON fo.id = t.id_fornecedor
            LEFT JOIN
                fin_plano_contas pc ON pc.id = t.id_plano_contas
            WHERE t.id = ?
            `, [id])
            const [itens_rateio] = await db.execute(`SELECT * FROM fin_cp_titulos_rateio WHERE id_titulo = ?`, [id])
            const titulo = rowTitulo && rowTitulo[0]
            // console.log(titulo)
            resolve({titulo, itens_rateio})
            return
        } catch (error) {
            reject(error)
            return
        }
    })
}


module.exports = {
    getAll,
    getOne,
}