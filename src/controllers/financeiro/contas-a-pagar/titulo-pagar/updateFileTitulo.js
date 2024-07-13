
const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");
const { replaceFileUrl } = require("../../../storage-controller");

module.exports = function updateFileTitulo(req) {
    return new Promise(async (resolve, reject) => {
        const { id, fileUrl, campo } = req.body;
        const conn = await db.getConnection();

        try {
            console.log({ fileUrl });
            await conn.beginTransaction();

            if (!id) {
                resolve({ message: "Sucesso!" });
            }
            // Lista de campos válidos
            const camposValidos = [
                "url_xml",
                "url_nota_fiscal",
                "url_boleto",
                "url_contrato",
                "url_planilha",
                "url_txt",
            ]; // Adicione mais campos conforme necessário

            // Verificar se o nome do campo é válido
            if (!camposValidos.includes(campo)) {
                throw new Error(
                    "Envie um campo válido; url_xml, url_nota_fiscal, url_boleto, url_contrato, url_planilha, url_txt"
                );
            }

            const [rowTitulo] = await conn.execute(
                `SELECT ${campo} FROM fin_cp_titulos WHERE id = ?`,
                [id]
            );
            const titulo = rowTitulo && rowTitulo[0];
            if (!titulo) {
                throw new Error("Solicitação não existe no sistema...");
            }

            const new_url = await replaceFileUrl({
                oldFileUrl: titulo[campo],
                newFileUrl: fileUrl
            })

            await conn.execute(
                `UPDATE fin_cp_titulos SET ${campo} = ? WHERE id = ? `,
                [new_url, id]
            );

            await conn.commit();
            resolve({ fileUrl: new_url });
            return;
        } catch (error) {
            logger.error({
                module: "FINANCEIRO",
                origin: "TITULOS A PAGAR",
                method: "UPDATE_FILE_TITULO",
                data: { message: error.message, stack: error.stack, name: error.name },
            });
            await conn.rollback();
            reject(error);
            return;
        } finally {
            conn.release();
        }
    });
}