
const { db } = require("../../../../../mysql");
const {
    normalizeFirstAndLastName,
} = require("../../../../helpers/mask");
const { logger } = require("../../../../../logger");
const { enviarEmail } = require("../../../../helpers/email");

module.exports = function changeStatusTitulo(req) {
    return new Promise(async (resolve, reject) => {
        const { id_titulo, id_novo_status, motivo } = req.body;
        const user = req.user;
        // console.log("REQ.BODY", req.body);

        const tipos_status = [
            { id: "0", status: "Arquivado" },
            { id: "1", status: "Solicitado" },
            { id: "2", status: "Negado" },
            { id: "3", status: "Aprovado" },
            { id: "4", status: "Pago Parcial" },
            { id: "5", status: "Pago" },
        ];

        const conn = await db.getConnection();
        try {
            if (!id_titulo) {
                throw new Error("ID do título não informado!");
            }
            if (!id_novo_status) {
                throw new Error("ID do novo status não informado!");
            }
            await conn.beginTransaction();

            // * Obter titulo e status
            const [rowTitulo] = await conn.execute(
                `SELECT 
                    t.id_status, 
                    u.email as email_solicitante 
                FROM fin_cp_titulos t 
                LEFT JOIN users u ON u.id = t.id_solicitante
                WHERE 
                    t.id = ? `,
                [id_titulo]
            );
            // Rejeitar caso título não encontrado
            if (!rowTitulo || rowTitulo.length === 0) {
                throw new Error(`Titulo de ID: ${id_titulo} não localizado!`);
            }
            const titulo = rowTitulo && rowTitulo[0];

            // Rejeitar caso id_status = '4', ou caso um vencimento já tenha sido pago:
            if (titulo.id_status == "4" || titulo.id_status == "5") {
                const status = titulo.id_status == "4" ? "pago parcial" : "pago";
                throw new Error(
                    `Alteração rejeitada pois o título já consta como ${status}!`
                );
            }
            const [vencimentosPagos] = await conn.execute(
                `SELECT id FROM fin_cp_titulos_vencimentos WHERE id_titulo = ? AND NOT data_pagamento IS NULL`,
                [id_titulo]
            );
            if (vencimentosPagos && vencimentosPagos.length > 0) {
                throw new Error("Título possui vencimento(s) pago(s)");
            }

            if (titulo.id_status == "2") {
                //* O título constava como Negado, então agora que o status será alterado, devemos Ativar os registros de consumo:
                await conn.execute(
                    `UPDATE fin_orcamento_consumo foc SET foc.active = true
          WHERE foc.id_item_rateio
        IN(
          SELECT tr.id
              FROM fin_cp_titulos_rateio tr
              WHERE tr.id_titulo = ?
          )`,
                    [id_titulo]
                );
            }

            // * Update fin_cp_titulos
            await conn.execute(
                `UPDATE fin_cp_titulos SET id_status = ? WHERE id = ? `,
                [id_novo_status, id_titulo]
            );

            // !: Caso Negado - Disparar Email + Inativar Consumo Orçamento
            if (id_novo_status == "2") {
                // Dispara um email:
                await enviarEmail({
                    assunto: `SOLICITAÇÃO DE PAGAMENTO NEGADA - #${id_titulo}`,
                    destinatarios: [titulo.email_solicitante],
                    corpo: `A sua solicitação foi negada pelo financeiro. 
                    \n Motivo: ${motivo}
                    \n Acesse o painel para mais detalhes: 
                    \n https://app.facell.com/financeiro/contas-a-pagar?tab=painel`
                })

                // Inativa consumo do orçamento
                await conn.execute(
                    `UPDATE fin_orcamento_consumo foc SET foc.active = false
          WHERE foc.id_item_rateio
        IN(
          SELECT tr.id
              FROM fin_cp_titulos_rateio tr
              WHERE tr.id_titulo = ?
          )`,
                    [id_titulo]
                );
            }

            // !: Caso Diferente de Aprovado e Pago - Remover de Borderô
            if (
                id_novo_status != "3" &&
                id_novo_status != "4" &&
                id_novo_status != "5"
            ) {
                await conn.execute(
                    `DELETE FROM fin_cp_bordero_itens WHERE id_vencimento IN( 
            SELECT tv.id FROM fin_cp_titulos_vencimentos tv WHERE tv.id_titulo = ?)`,
                    [id_titulo]
                );
            }

            let historico = ``;
            let author = normalizeFirstAndLastName(user?.nome);
            let textoMotivo = motivo
                ? ` MOTIVO: ${conn.escape(motivo)?.toUpperCase()} `
                : "";

            if (id_novo_status == "0") {
                historico = `ARQUIVADO POR: ${author}.`;
                historico += textoMotivo;
            }
            if (id_novo_status == "1") {
                historico = `RETORNADO PARA SOLICITADO POR: ${author}.`;
                historico += textoMotivo;
            }
            if (id_novo_status == "2") {
                historico = `NEGADO POR: ${author}.`;
                historico += textoMotivo;
            }
            if (id_novo_status == "3") {
                historico = `APROVADO POR: ${author}.`;
            }
            if (id_novo_status == "4") {
                historico = `PAGO PARCIAL POR: ${author}.`;
            }
            if (id_novo_status == "5") {
                historico = `PAGO POR: ${author}.`;
            }

            // ^ Gerar histórico no título
            if (historico) {
                await conn.execute(
                    `INSERT INTO fin_cp_titulos_historico(id_titulo, descricao) VALUES(?, ?)`,
                    [id_titulo, historico]
                );
            }

            await conn.commit();
            resolve({ message: "Sucesso!" });
        } catch (error) {
            logger.error({
                module: "FINANCEIRO",
                origin: "TITULOS A PAGAR",
                method: "CHANGE_STATUS_TITULO",
                data: { message: error.message, stack: error.stack, name: error.name },
            });
            await conn.rollback();
            reject(error);
        } finally {
            conn.release();
        }
    });
}