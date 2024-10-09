const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { enviarEmail } = require("../../../../../helpers/email");
const { normalizeFirstAndLastName } = require("../../../../../helpers/mask");

module.exports = function changeStatusTitulo(req) {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      conn = await db.getConnection();
      const { id_titulo, id_novo_status, motivo } = req.body;
      const user = req.user;
      // console.log("REQ.BODY", req.body);

      const tipos_status = [
        { id: "0", status: "Arquivado" },
        { id: "10", status: "Criado" },
        { id: "20", status: "Cancelado" },
        { id: "30", status: "Emitido" },
        { id: "40", status: "Pago Parcial" },
        { id: "50", status: "Pago" },
      ];
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
            t.id_status, u.email as email_solicitante,
            t.id_tipo_documento, t.url_nota_fiscal,
            t.url_nota_debito, t.url_recibo, t.num_doc
        FROM fin_cr_titulos t
        LEFT JOIN users u ON u.id = t.id_user
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
      if (titulo.id_status == "40" || titulo.id_status == "50") {
        const status = titulo.id_status == "40" ? "pago parcial" : "pago";
        throw new Error(`Alteração rejeitada pois o título já consta como ${status}!`);
      }
      const [vencimentosPagos] = await conn.execute(
        `SELECT id FROM fin_cr_titulos_vencimentos WHERE id_titulo = ? AND NOT valor_pago IS NULL`,
        [id_titulo]
      );
      if (vencimentosPagos && vencimentosPagos.length > 0) {
        throw new Error("Título possui vencimento(s) pago(s)");
      }

      // * Update fin_cr_titulos
      await conn.execute(`UPDATE fin_cr_titulos SET id_status = ? WHERE id = ? `, [
        id_novo_status,
        id_titulo,
      ]);

      // !: Caso Emitir - Validar campos obrigatórios
      if (id_novo_status == "30") {
        const { id_tipo_documento, url_nota_fiscal, url_nota_debito, url_recibo, num_doc } = titulo;
        console.log(titulo);

        if (!num_doc) throw new Error("É necessário informar o Núm. Doc.");
        if (!id_tipo_documento) throw new Error("É necessário informar o tipo de documento");
        if (id_tipo_documento === "10") {
          if (!url_nota_fiscal) {
            throw new Error("Faça o upload da Nota Fiscal!");
          }
        }
        if (id_tipo_documento === "20") {
          if (!url_nota_debito) {
            throw new Error("Faça o upload da Nota de Débito!");
          }
        }
        if (id_tipo_documento === "30") {
          if (!url_recibo) {
            throw new Error("Faça o upload do Recibo!");
          }
        }
      }

      // !: Caso Cancelado - Disparar Email
      // if (id_novo_status == "20") {
      //   // Dispara um email:
      //   await enviarEmail({
      //     assunto: `SOLICITAÇÃO DE RECEBIMENTO NEGADA - #${id_titulo}`,
      //     destinatarios: [titulo.email_solicitante],
      //     corpo: `A sua solicitação foi cancelada.
      //               \n Motivo: ${motivo}
      //               \n Acesse o painel para mais detalhes:
      //               \n https://app.facell.com/financeiro/contas-a-pagar?tab=painel`,
      //   });
      // }

      let historico = ``;
      let author = normalizeFirstAndLastName(user?.nome || "SISTEMA");
      let textoMotivo = motivo ? ` MOTIVO: ${conn.escape(motivo)?.toUpperCase()} ` : "";

      if (id_novo_status == "0") {
        historico = `ARQUIVADO POR: ${author}.`;
        historico += textoMotivo;
      }
      if (id_novo_status == "10") {
        historico = `RETORNADO PARA SOLICITADO POR: ${author}.`;
        historico += textoMotivo;
      }
      if (id_novo_status == "20") {
        historico = `CANCELADO POR: ${author}.`;
        historico += textoMotivo;
      }
      if (id_novo_status == "30") {
        historico = `EMITIDO POR: ${author}.`;
      }
      if (id_novo_status == "40") {
        historico = `PAGO PARCIAL POR: ${author}.`;
      }
      if (id_novo_status == "50") {
        historico = `PAGO POR: ${author}.`;
      }

      // ^ Gerar histórico no título
      if (historico) {
        await conn.execute(
          `INSERT INTO fin_cr_titulos_historico(id_titulo, descricao) VALUES(?, ?)`,
          [id_titulo, historico]
        );
      }

      // await conn.rollback();
      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS_A_RECEBER",
        method: "CHANGE_STATUS_TITULO_RECEBER",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
};
