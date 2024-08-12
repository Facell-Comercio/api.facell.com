const { formatDate } = require("date-fns");
const { logger } = require("../../../../logger");
const {db} = require("../../../../mysql");
const createDateArrayFromRange = require("../../../helpers/createDateArrayFromRange");
const { getMovimentoCaixa } = require("../api");

async function checkSeRecarga({conn, pedido}){
    return new Promise(async(resolve, reject)=>{
        try {
            const [rowsVenda] = await conn.execute(`SELECT id WHERE grupoEstoque = 'RECARGA ELETRONICA' AND numeroPedido = ? `, [pedido])
            const isRecarga = rowsVenda && rowsVenda.length > 0 
            resolve(isRecarga)
        } catch (error) {
            reject(error)
        }
    })
}

async function processarCaixa({conn, id_caixa, id_filial, data, movimento}){
    return new Promise(async(resolve, reject)=>{
        try {
            if(!(movimento && movimento.length > 0)){
                throw new Error('Movimento de caixa vazio')
            }
            if(!id_caixa){
                throw new Error('id_caixa não recebido!')
            }
            

            let valor_cartao = 0;
            let valor_dinheiro = 0;
            let valor_retiradas = 0;
            let valor_pix = 0;
            let valor_pitzi = 0;

            // CRUZAR COM VENDAS PELO PEDIDO (SEM PV) + GRUPO ESTOQUE = 'RECARGA ELETRONICA'
            let valor_recarga = 0;

            // FORMA_PGTO = TRADEIN || TRADE IN
            let valor_tradein = 0;
            for(const item of movimento){
                const valor = parseFloat(item.VALOR || 0)
                const pedido = item.DOCUMENTO;
                const forma_pgto = (item.FORMA_PGTO && item.FORMA_PGTO.toUpperCase()) || ''
                const tipo_operacao = (item.TIPO_OPERACAO && item.TIPO_OPERACAO.toUpperCase()) || ''
                const historico = (item.HISTORICO && item.HISTORICO.toUpperCase()) || ''
                const credito_debito = (item.CREDITO_DEBITO && item.CREDITO_DEBITO.toUpperCase()) || null

                let isRecarga = false;
                if(tipo_operacao == 'Venda' && !historico.includes('CANCELAMENTO')){
                    try {
                        isRecarga = await checkSeRecarga({conn, pedido: pedido.replace('PV', '')})
                    } catch (error) { }
                }

                if(forma_pgto == 'DINHEIRO'){
                    if(tipo_operacao == 'VENDA'){
                        // * Dinheiro
                        valor_dinheiro += valor
                    }else if(tipo_operacao == 'DEVOLUÇÃO'){
                        valor_dinheiro -= valor
                    }else{
                        // ! Despesa
                        valor_retiradas += valor
                    }
                }

                if(forma_pgto == 'CARTÃO'){
                    valor_cartao += valor
                }

                if(forma_pgto == 'TRADEIN' || forma_pgto == 'TRADE IN'){
                    valor_tradein += valor
                }

                if(forma_pgto.includes('PIX')){
                    valor_pix += valor
                }
                if(forma_pgto.includes('PITZI')){
                    valor_pitzi += valor
                }

                if(tipo_operacao.includes('VENDA') && isRecarga){
                    valor_recarga += valor
                }

                // * Insere o item do caixa:
                await conn.execute(`INSERT INTO datasys_caixas_itens (
                    id_caixa,
                    data,
                    documento,
                    forma_pagamento,
                    tipo_operacao,
                    historico,
                    credito_debito,
                    operador,
                    valor
                ) VALUES (?,?,?,?,?,?,?,?,?)`, [
                    id_caixa, 
                    formatDate(item.DATA_MOVIMENTO, 'yyyy-MM-dd hh:mm:ss'), 
                    pedido,
                    forma_pgto,
                    tipo_operacao,
                    historico,
                    credito_debito,
                    item.OPERADOR,
                    valor.toFixed(4)
                 ])
            }

            // * Atualiza o caixa:
            await conn.execute(`UPDATE datasys_caixas 
                SET 
                    valor_cartao = :valor_cartao,
                    valor_dinheiro = :valor_dinheiro,
                    valor_retiradas = :valor_retiradas,
                    valor_recarga = :valor_recarga,
                    valor_pix = :valor_pix,
                    valor_pitzi = :valor_pitzi,
                    valor_tradein = :valor_tradein

                WHERE id = :id_caixa`, 
                {
                    valor_cartao,
                    valor_dinheiro,
                    valor_recarga,
                    valor_retiradas,
                    valor_pitzi,
                    valor_pix,
                    valor_tradein,
                    id_caixa,
                });
            

            
            resolve({ id_caixa, id_filial, data, status: 'OK', message: 'OK' })
        } catch (error) {
            reject({ id_caixa, id_filial, data, status: 'ERRO', message: error.message})
        }
    })
}

module.exports = async (req)=>{
    return new Promise(async(resolve, reject)=>{
        let conn
        try {
            const { id_filial, range_datas } = req.body;
            // ^ Validações
            if(!id_filial){
                throw new Error('ID Filial não informado!')
            }
            if(!range_datas){
                throw new Error('Período não informado!')
            }
            
            conn = await db.getConnection()
            conn.config.namedPlaceholders = true

            const [rowFilial] = await conn.execute(`SELECT f.cnpj, f.nome, g.nome as grupo_economico FROM filiais f LEFT JOIN grupos_economicos g ON g.id = f.id_grupo_economico WHERE f.id = ?`, [id_filial])
            const filial = rowFilial && rowFilial[0];
            if(!filial){
                throw new Error('Filial não localizada no sistema!')
            }

            await conn.beginTransaction();
            const datas = createDateArrayFromRange(range_datas)
            
            const result = []
            for(const data of datas){
                const [rowCaixaBanco] = await conn.execute(`SELECT id FROM datasys_caixas WHERE id_filial = ? AND data = ?`, [id_filial, data])
                const caixaBanco = rowCaixaBanco && rowCaixaBanco[0]
                let id_caixa = caixaBanco && caixaBanco['id'];
                if(id_caixa){
                    // ! Remover todos os itens do caixa:
                    await conn.execute(`DELETE FROM datasys_caixas_itens WHERE id_caixa = ?`, [id_caixa])
                }else{
                    // Inserir o novo caixa vazio no sistema:
                    const [insertedCaixa] = await conn.execute(`INSERT INTO datasys_caixas (id_filial, data) VALUES (?,?)`,[id_filial, data])
                    id_caixa = insertedCaixa.insertId;
                }

                const movimento = await getMovimentoCaixa({cnpj: filial.cnpj, data, grupo_economico: filial.grupo_economico})

                const caixa = await processarCaixa({conn, id_caixa, id_filial, data, movimento: movimento.filter(mov=>mov.LOJA == filial.cnpj)})
                result.push(caixa)
            }
            
            await conn.commit()
            resolve(result)
        } catch (error) {
            await conn.rollback()
            reject(error)
            logger.error({
                module: 'DATASYS', origin: 'CAIXAS', method: 'IMPORT',
                data: { message: error.message, stack: error.stack, name: error.name }
              })
        }finally{
            if(conn) conn.release()
        }
    })
}