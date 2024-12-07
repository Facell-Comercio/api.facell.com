const { formatDate } = require("date-fns");
const { db } = require("../../../../../mysql");
const folderList = [
    '2024-06-01',
    '2024-01-01'
]

exports.calcular = (data) => {
    return new Promise(async (resolve, reject) => {
        let conn;
        try {
            // Validações
            const { ciclo, metas, agregadores } = data || {}
            if (!ciclo) throw new Error("Preencha o ciclo de pagamento!")
            if ((!metas || metas.length === 0) && (!agregadores || agregadores.length === 0)) throw new Error("Nenhuma meta foi recebida para cálculo")

            conn = await db.getConnection();

            const fila = []
            if (metas && metas.length > 0) {
                for (const meta of metas) {
                    // Obtem a meta no banco
                    const [rowsMetaBanco] = await conn.execute(`SELECT *, 'meta' as tipo FROM metas WHERE id = ?`, [meta.id])
                    const metaBanco = rowsMetaBanco && rowsMetaBanco[0];
                    const ref = formatDate(metaBanco.ref, 'yyyy-MM-dd')
                    
                    // Seleciona a pasta correta conforme a data de referência da meta
                    let mesSelecionado = folderList.find(folder => folder <= ref);
                    // Obtem a função que calcula de acordo com o cargo:
                    const cargos = require(`./${mesSelecionado}/cargos/`);
                    const calculo = cargos[metaBanco.cargo]
                    // Pula, caso função não localizada.
                    if (!calculo) continue;
                    
                    
                    fila.push(calculo({ meta: metaBanco }))
                }
            }
            if (agregadores && agregadores.length > 0) {
                for (const agregador of agregadores) {
                    // Obtem a meta no banco
                    const [rowsAgregadorBanco] = await conn.execute(`SELECT *, 'agregador' as tipo FROM metas_agregadores WHERE id = ?`, [agregador.id]);
                    const agregadorBanco = rowsAgregadorBanco && rowsAgregadorBanco[0];
                    const ref = formatDate(agregadorBanco.ref, 'yyyy-MM-dd')
                    // Seleciona a pasta correta conforme a data de referência da meta
                    let mesSelecionado = folderList.find(folder => folder <= ref);
                    // Obtem a função que calcula de acordo com o cargo:
                    const cargos = require(`./${mesSelecionado}/cargos/`);
                    const calculo = cargos[agregadorBanco.cargo]
                    // Pula, caso função não localizada.
                    if (!calculo) continue;

                    fila.push(calculo({ meta: agregadorBanco }))
                }
            }
            await Promise.all(fila)
            resolve(data)
        } catch (error) {
            reject(error)
        } finally {
            if (conn) conn.release();
        }
    })
}