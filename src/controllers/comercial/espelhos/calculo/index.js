const { formatDate } = require("date-fns");
const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");
const folderList = [
    '2024-12-01',
    '2024-06-01',
];

function getBaseCalculoByRefAndCargo(ref, cargo){
   const folderName = folderList.find(folder => folder <= ref)
   const basesCalculo = require(`./${folderName}/cargos/`);
   const calculo = basesCalculo[cargo]
    return calculo
}

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
                
                    let baseCalculo = getBaseCalculoByRefAndCargo(ref, metaBanco.cargo)
                    if(!baseCalculo){
                        throw new Error(`Base de cálculo não localizada para o cargo ${metaBanco.cargo} e ref: ${ref} `)
                    }
                    fila.push(baseCalculo({ meta: metaBanco }))
                }
            }
            if (agregadores && agregadores.length > 0) {
                for (const agregador of agregadores) {
                    // Obtem a meta no banco
                    const [rowsAgregadorBanco] = await conn.execute(`SELECT *, 'agregador' as tipo FROM metas_agregadores WHERE id = ?`, [agregador.id]);
                    const agregadorBanco = rowsAgregadorBanco && rowsAgregadorBanco[0];
                    const ref = formatDate(agregadorBanco.ref, 'yyyy-MM-dd')

                    let baseCalculo = getBaseCalculoByRefAndCargo(ref, agregadorBanco.cargo)
                    if(!baseCalculo){
                        throw new Error(`Base de cálculo não localizada para o cargo ${agregadorBanco.cargo} e ref: ${ref} `)
                    }

                    fila.push(baseCalculo({ meta: agregadorBanco }))
                }
            }
            await Promise.all(fila)
            resolve(data)
        } catch (error) {
            reject(error)
            logger.error({
                module: 'COMERCIAL',
                origin: 'COMISSÃO',
                method: 'CALCULAR',
                data: { message: error.message, stack: error.stack, name: error.name }
            })
        } finally {
            if (conn) conn.release();
        }
    })
}