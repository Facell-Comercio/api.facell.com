const { db } = require("../../../../../../../mysql");

module.exports = ({ meta }) => {
    return new Promise(async (resolve, reject) => {
        let conn;
        try {
            let cargo = meta.cargo;
            let ref = meta.ref;
            let filial = meta.filial;

            conn = await db.getConnection();
            // Selecionar a política de data <= ref;
            const [rowPolitica] = await conn.execute(`SELECT id FROM comissao_politica 
                WHERE ref <= ? 
                ORDER BY ref DESC
                LIMIT 1
                `, [ref])
            const politica = rowPolitica && rowPolitica[0]
            if (!politica) throw new Error(`Política para a referência ${ref} não localizada.`)

            // Selecionar o cargo;
            const [rowCargoBanco] = await conn.execute(`SELECT id FROM comissao_cargos WHERE cargo = ?`, [cargo]);
            const cargoBanco = rowCargoBanco && rowCargoBanco[0];
            if (!cargoBanco) throw new Error(`Cargo ${cargo} não localizado no banco de dados!`)

            const [rowCargoPolitica] = await conn.execute(`SELECT id FROM comissao_politica_cargos WHERE id_politica = ? AND id_cargo = ?`, [politica.id, cargoBanco.id])
            const cargoPolitica = rowCargoPolitica && rowCargoPolitica[0]

            // Pega o id da filial;
            const [rowFilialBanco] = await conn.execute(`SELECT id FROM filiais WHERE nome = ?`, [filial])
            const filialBanco = rowFilialBanco && rowFilialBanco[0];

            let rowModelo;
            if (filialBanco) {
                // Procurar por modelo da filial;
                [rowModelo] = await conn.execute(`SELECT id_modelo FROM comissao_politica_modelos_filiais WHERE id_filial = ? AND id_cargo_politica = ?`, [filialBanco.id, cargoPolitica.id]);

            } 
            const id_modelo = (rowModelo && rowModelo[0] && rowModelo[0]['id_modelo']) || null;

            // Retornar modelo padrão;
            const [itens] = await conn.execute(`SELECT cpi.*, cs.key as segmento_key 
                FROM comissao_politica_itens cpi
                LEFT JOIN comissao_segmentos cs ON cs.id = cpi.id_segmento
                WHERE cpi.id_cargo_politica = ? AND cpi.id_modelo ${id_modelo ? '= '+id_modelo : ' is NULL '}`, [cargoPolitica.id])
            for(const item of itens){
                const [escalonamento] = await conn.execute(`SELECT * FROM comissao_politica_itens_escalonamento WHERE id_item_politica =?`, [item.id])
                item.escalonamento = escalonamento;
            }

            resolve(itens);
        } catch (error) {
            reject(error)
        } finally {
            if(conn) conn.release();
        }
    })
}