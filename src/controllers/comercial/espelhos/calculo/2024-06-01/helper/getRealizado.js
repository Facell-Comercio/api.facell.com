const { logger } = require("../../../../../../../logger");
const { db } = require("../../../../../../../mysql");

exports.getRealizado = ({ meta }) => {
    return new Promise(async (resolve, reject) => {
        let conn;
        try {
            conn = await db.getConnection();
            let realizado = {};
            let whereVendas = ` WHERE 1<>1 OR ( `;
            let whereAtivacoes = ` WHERE 1<>1 OR ( `;

            if(meta.tipo == 'agregador'){
                let metas_agregadas = meta.metas_agregadas?.split(';')
                if(!metas_agregadas || metas_agregadas.length === 0){
                    throw new Error(`Agregador ${meta.nome} sem metas agregadas!`)
                }
                if(meta.tipo_agregacao == 'FILIAL'){
                    whereVendas+= ` v.filial IN(${metas_agregadas.map(m=>db.escape(m)).join(',')})`
                    whereAtivacoes+= ` v.filial IN(${metas_agregadas.map(m=>db.escape(m)).join(',')})`
                }else{
                    whereVendas+= ` v.cpfVendedor IN(${metas_agregadas.map(m=>db.escape(m)).join(',')})`
                    whereAtivacoes+= ` v.cpfVendedor IN(${metas_agregadas.map(m=>db.escape(m)).join(',')})`
                }
            }else{
                
            }


            whereVendas += ` ) `;
            // * CAPTURA REALIZADO DE VENDAS;
            const [realizadoVendas] = await conn.execute(
                ` 
                SELECT 
                    SUM(CASE WHEN v.grupoEstoque = 'APARELHO' THEN v.valorCaixa END) as aparelho,
        
                    SUM(CASE WHEN v.grupoEstoque = 'APARELHO' AND NOT v.descrComercial LIKE '%APPLE%' AND NOT ((v.modalidadeVenda LIKE '%TROCA%' OR v.modalidadeVenda LIKE '%VENDA%') AND (v.fidAparelho = 'NÃO' AND v.fidPlano = 'NÃO'))
                    THEN v.valorCaixa END) as android_mov,
        
                    SUM(CASE WHEN v.grupoEstoque = 'APARELHO' AND NOT v.descrComercial LIKE '%APPLE%' AND ((v.modalidadeVenda LIKE '%TROCA%' OR v.modalidadeVenda LIKE '%VENDA%') AND (v.fidAparelho = 'NÃO' AND v.fidPlano = 'NÃO')) 
                    THEN v.valorCaixa END) as android_sem_mov,
        
                    SUM(CASE WHEN v.grupoEstoque = 'APARELHO' AND v.descrComercial LIKE '%APPLE%' AND NOT ((v.modalidadeVenda LIKE '%TROCA%' OR v.modalidadeVenda LIKE '%VENDA%') AND (v.fidAparelho = 'NÃO' AND v.fidPlano = 'NÃO')) 
                    THEN v.valorCaixa END) as apple_mov,
        
                    SUM(CASE WHEN v.grupoEstoque = 'APARELHO' AND v.descrComercial LIKE '%APPLE%' AND ((v.modalidadeVenda LIKE '%TROCA%' OR v.modalidadeVenda LIKE '%VENDA%') AND (v.fidAparelho = 'NÃO' AND v.fidPlano = 'NÃO')) 
                    THEN v.valorCaixa END) as apple_sem_mov,
        
                    SUM(CASE WHEN v.grupoEstoque LIKE '%ACESS%' THEN v.valorCaixa END) as acessorio,
        
                    SUM(CASE WHEN v.grupoEstoque LIKE '%ACESS%' AND v.descrComercial LIKE '%JBL%' THEN v.valorCaixa END) as jbl
        
                FROM
                    ${datasys_vendas} v
                WHERE
                    v.tipoPedido = 'Venda'
                    AND DATE(v.dataPedido) BETWEEN ? AND ?  
                    AND v.filial = ?
                    AND v.cpfVendedor LIKE CONCAT('%', ?, '%')
                GROUP BY
                    v.cpfVendedor
                    `,
                [meta.data_inicial, meta.data_final, meta.filial, meta.cpf]
            );
            const vendas = realizadoVendas && realizadoVendas[0];
            realizado = { ...realizado, ...vendas }

            whereAtivacoes += ` ) `;
            //* CAPTURA REALIZADO DE ATIVAÇÕES
            const [realizadoAtivacoes] = await db.execute(
                `
                SELECT 
                    v.cpfVendedor,
                    COUNT(CASE WHEN v.categoria = 'PÓS PURO' THEN v.id END) as pos,
                    COUNT(CASE WHEN v.categoria = 'PÓS PURO' AND (v.plaOpera LIKE '%MULTI%' OR v.plaOpera LIKE '%FAM%') THEN v.id END) as pos_titular,
                    COUNT(CASE WHEN v.categoria = 'PÓS PURO' AND NOT (v.plaOpera LIKE '%MULTI%' OR v.plaOpera LIKE '%FAM%' OR v.plaOpera LIKE '%DEPEN%') THEN v.id END) as pos_individual,
              
                    COUNT(CASE WHEN v.categoria = 'CONTROLE' THEN v.id END) as controle,
                    COUNT(CASE WHEN v.categoria = 'CONTROLE' AND v.plaOpera LIKE '%CONTROLE A%' THEN v.id END) as controle_a,
                    SUM(CASE WHEN v.tipo_movimento <> 'UPGRADE 2' THEN v.valor_receita END) as receita,
                    COUNT(CASE WHEN v.tipo_movimento = 'UPGRADE 1' THEN v.id END) as upgrade,
                    COUNT(CASE WHEN v.tipo_movimento = 'UPGRADE 2' THEN v.id END) as upgrade2,
                    COUNT(CASE WHEN v.categoria = 'TIM FIXO' OR v.categoria = 'WTTX' OR v.categoria = 'LIVE' THEN v.id END) as residenciais,
                    COUNT(CASE WHEN v.categoria = 'LIVE' THEN v.id END) as live
                FROM
                    ${datasys_ativacoes} v
                WHERE
                    v.dtAtivacao BETWEEN ? AND ?
                    AND v.filial = ?
                    AND v.cpfVendedor LIKE CONCAT('%', ?, '%')
                    AND NOT v.statusLinha IN ('VENDA IRREGULAR', 'CANCELADA', 'DUPLICIDADE')
                GROUP BY
                    v.cpfVendedor;
                    `,
                [meta.data_inicial, meta.data_final, meta.filial, meta.cpf]
            );
            const servico = realizadoAtivacoes && realizadoAtivacoes[0];
            realizado = { ...realizado, ...servico }
            // Vendas indiretas
            resolve(realizado)
        } catch (error) {
            reject(error)
            logger.error({
                module: 'COMERCIAL',
                origin: 'COMISSÃO',
                method: 'GET_REALIZADO',
                data: { message: error.message, stack: error.stack, name: error.name }
            })
        } finally {
            if (conn) conn.release();
        }
    })
}