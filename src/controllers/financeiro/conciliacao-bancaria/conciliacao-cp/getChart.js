const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = function getChartConciliacaoPagamentos(req) {
    return new Promise(async (resolve, reject) => {
        let conn;
        try {
            conn = await db.getConnection();
            
            // Filtros
            const { filters } = req.query;

            const { id_conta_bancaria, ano, mes, range_data, naoConciliaveis = false } = filters || {};
            let where = ` WHERE 1=1 `;
            const params = [];

            if (id_conta_bancaria) {
                where += ` AND e.id_conta_bancaria = ? `;
                params.push(id_conta_bancaria);
            }

            if (mes) {
                where += ` AND MONTH(e.data_transacao) = ? `;
                params.push(mes);
            }

            if (ano) {
                where += ` AND YEAR(e.data_transacao) = ? `;
                params.push(ano);
            }

            // if (range_data) {
            //     const { from: data_de, to: data_ate } = range_data;
            //     if (data_de && data_ate) {
            //         where += ` AND e.data_transacao BETWEEN '${data_de.split("T")[0]}' AND '${data_ate.split("T")[0]
            //             }'  `;
            //     } else {
            //         if (data_de) {
            //             where += ` AND e.data_transacao = '${data_de.split("T")[0]}' `;
            //         }
            //         if (data_ate) {
            //             where += ` AND e.data_transacao = '${data_ate.split("T")[0]}' `;
            //         }
            //     }
            // }

            // Caso seja informado, vamos avaliar as transações não conciliaveis:
            if (naoConciliaveis !== undefined) {
                if (!naoConciliaveis) {
                    // Vamos retirar as não conciliaveis
                    const [transacoesNaoConciliaveis] = await conn.execute(
                        `SELECT descricao, tipo_transacao FROM fin_extratos_padroes WHERE id_conta_bancaria = ?`,
                        [id_conta_bancaria]
                    );
                    for (const transacaoNaoConciliavel of transacoesNaoConciliaveis) {
                        where += ` AND NOT (e.descricao = ? AND e.tipo_transacao = ?)`;
                        params.push(transacaoNaoConciliavel.descricao);
                        params.push(transacaoNaoConciliavel.tipo_transacao);
                    }
                }
            }

            

            const [dataChartConciliacaoPagamentos] = await conn.execute(
                `
                SELECT
                e.data_transacao, 
                count(e.id) as total,
                SUM(CASE WHEN cbi.id_item IS NULL THEN 0 ELSE 1 END) as conciliado,
                SUM(CASE WHEN cbi.id_item IS NULL THEN 1 ELSE 0 END) as pendente
                FROM fin_extratos_bancarios e
                LEFT JOIN fin_conciliacao_bancaria_itens cbi ON cbi.tipo = 'transacao' AND cbi.id_item = e.id
                ${where} AND e.tipo_transacao = 'DEBIT' and e.id_duplicidade is NULL
                GROUP BY e.data_transacao
            `, params);


            resolve(dataChartConciliacaoPagamentos);
        } catch (error) {
            logger.error({
                module: "FINANCEIRO",
                origin: "CONCILIÇÃO BANCÁRIA CP",
                method: "GET_CONCILIACOES",
                data: { message: error.message, stack: error.stack, name: error.name },
            });
            reject(error);
        } finally {
            if (conn) conn.release();
        }
    });
};
