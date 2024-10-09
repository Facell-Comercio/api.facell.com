const { format, startOfDay } = require("date-fns");
const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { replaceFileUrl } = require("../../../../storage-controller");
const { normalizeFirstAndLastName } = require("../../../../../helpers/mask");

module.exports = async = (req) => {
  return new Promise(async (resolve, reject) => {
    let conn;

    try {
      conn = await db.getConnection();
      const { user } = req;

      await conn.beginTransaction();
      const data = req.body;
      const {
        id,
        // Fornecedor
        id_fornecedor,

        // Geral
        // id_tipo_documento,
        id_filial,
        id_grupo_economico,

        id_tipo_documento,
        data_emissao,
        num_doc,
        tim_pedido,
        tim_pedido_sap,
        valor,
        descricao,

        vencimentos,

        id_rateio,
        itens_rateio,

        url_xml_nota,
        url_nota_fiscal,
        url_nota_debito,
        url_planilha,
        url_outros,
        url_recibo,

        update_rateio,
        update_vencimentos,
      } = data || {};

      // ^ Validações
      // Titulo
      if (!id) {
        throw new Error("ID do título não informado!");
      }
      if (!id_filial) {
        throw new Error("Campo id_filial não informado!");
      }
      if (!id_grupo_economico) {
        throw new Error("Campo id_grupo_economico não informado!");
      }
      if (!id_fornecedor) {
        throw new Error("Campo id_fornecedor não informado!");
      }
      if (!descricao) {
        throw new Error("Campo Descrição não informado!");
      }

      // Vencimentos
      if (!vencimentos || vencimentos.length === 0) {
        throw new Error("Campo vencimentos não informado!");
      }

      // Rateio
      if (!itens_rateio || itens_rateio.length === 0) {
        throw new Error("Campo itens_rateio não informado!");
      }

      // Obter dados do Titulo no banco:
      const [rowTitulo] = await conn.execute(`SELECT * FROM fin_cr_titulos WHERE id = ?`, [id]);
      const titulo = rowTitulo && rowTitulo[0];
      if (!titulo) throw new Error("Título não localizado!");

      // ^ Validar se algum vencimento já foi pago, se sim, abortar.
      const [vencimentosPagos] = await conn.execute(
        "SELECT id FROM fin_cr_titulos_vencimentos WHERE id_titulo = ? AND NOT valor_pago IS NULL",
        [id]
      );
      if (vencimentosPagos && vencimentosPagos.length) {
        throw new Error(
          `Impossível editar a solicitação pois já existem ${vencimentosPagos.length} vencimentos pagos..`
        );
      }

      // Obter os Vencimentos anteriores para registra-los no histórico caso precise
      const [vencimentos_anteriores] = await conn.execute(
        `SELECT tv.*
                    FROM fin_cr_titulos_vencimentos tv
                    WHERE tv.id_titulo = ?`,
        [titulo.id]
      );

      // ~ Início de Manipulação de Rateio //////////////////////
      // * Validação de orçamento e atualização do rateio
      if (update_rateio) {
        // ! Excluir Antigo rateio
        await conn.execute(`DELETE FROM fin_cr_titulos_rateio WHERE id_titulo = ?`, [id]);

        // * Persistir o rateio
        for (const item_rateio of itens_rateio) {
          const valorRateio = parseFloat(item_rateio.valor);

          if (!valorRateio) {
            throw new Error(`O Rateio não possui Valor! Rateio: ${JSON.stringify(item_rateio)}`);
          }
          if (!item_rateio.id_filial) {
            throw new Error(`O Rateio não possui Filial! Rateio: ${JSON.stringify(item_rateio)}`);
          }
          if (!item_rateio.id_centro_custo) {
            throw new Error(
              `O Rateio não possui Centro de custo! Rateio: ${JSON.stringify(item_rateio)}`
            );
          }
          if (!item_rateio.id_plano_conta) {
            throw new Error(
              `O Rateio não possui Plano de contas! Rateio: ${JSON.stringify(item_rateio)}`
            );
          }

          // * Persistência de rateio
          await conn.execute(
            `INSERT INTO fin_cr_titulos_rateio (id_titulo, id_filial, id_centro_custo, id_plano_conta, percentual, valor) VALUES (?,?,?,?,?,?)`,
            [
              id,
              item_rateio.id_filial,
              item_rateio.id_centro_custo,
              item_rateio.id_plano_conta,
              item_rateio.percentual,
              valorRateio.toFixed(4),
            ]
          );
        }
      }
      // ~ Fim de Manipulação de Rateio //////////////////////

      // * Manipulação de vencimentos - caso update_vencimentos = true //////////////////////
      if (update_vencimentos) {
        // ! Excluir Antigos Vencimentos
        await conn.execute(`DELETE FROM fin_cr_titulos_vencimentos WHERE id_titulo = ?`, [id]);

        // * Salvar os novos vencimentos
        // Passamos por cada vencimento novo, validando campos e inserindo no banco
        for (const vencimento of vencimentos) {
          // ^ Validar se vencimento possui todos os campos obrigatórios
          const valorVencimento = parseFloat(vencimento.valor);

          if (!vencimento.data_vencimento) {
            throw new Error(
              `O vencimento não possui data de vencimento! Vencimento: ${JSON.stringify(
                vencimento
              )}`
            );
          }
          if (!valorVencimento) {
            throw new Error(`O vencimento não possui valor! Item: ${JSON.stringify(vencimento)}`);
          }

          // * Insert do vencimento:
          await conn.execute(
            `INSERT INTO fin_cr_titulos_vencimentos (id_titulo, data_vencimento,  valor) VALUES (?,?,?)`,
            [id, formatDate(vencimento.data_vencimento, "yyyy-MM-dd"), valorVencimento]
          );
        }
      }
      //~ Fim de manipulação de vencimentos //////////////////////

      // Persitir os anexos, remover os antigos:
      const nova_url_xml = await replaceFileUrl({
        oldFileUrl: titulo.url_xml_nota,
        newFileUrl: url_xml_nota,
      });
      const nova_url_nota_fiscal = await replaceFileUrl({
        oldFileUrl: titulo.url_nota_fiscal,
        newFileUrl: url_nota_fiscal,
      });
      const nova_url_nota_debito = await replaceFileUrl({
        oldFileUrl: titulo.url_nota_debito,
        newFileUrl: url_nota_debito,
      });
      const nova_url_recibo = await replaceFileUrl({
        oldFileUrl: titulo.url_recibo,
        newFileUrl: url_recibo,
      });
      const nova_url_planilha = await replaceFileUrl({
        oldFileUrl: titulo.url_planilha,
        newFileUrl: url_planilha,
      });
      const nova_url_outros = await replaceFileUrl({
        oldFileUrl: titulo.url_outros,
        newFileUrl: url_outros,
      });

      // Persistir novos dados do Titulo
      await conn.execute(
        `UPDATE fin_cr_titulos
                SET
                id_fornecedor = ?,

                id_tipo_documento = ?,
                id_filial = ?,
                
                data_emissao = ?,
                num_doc = ?,
                valor = ?,
                descricao = ?,

                tim_pedido = ?,
                tim_pedido_sap = ?,
                
                id_rateio = ?,
        
                url_xml_nota = ?,
                url_nota_fiscal = ?,
                url_nota_debito = ?,
                url_planilha = ?,
                url_outros = ?,
                url_recibo = ?,
        
                updated_at = current_timestamp()
        
                WHERE id = ?
                `,
        [
          id_fornecedor,

          id_tipo_documento || null,
          id_filial,

          data_emissao ? startOfDay(data_emissao) : null,
          num_doc || null,
          valor,
          descricao,

          tim_pedido || null,
          tim_pedido_sap || null,

          id_rateio || null,

          nova_url_xml || null,
          nova_url_nota_fiscal || null,
          nova_url_nota_debito || null,
          nova_url_planilha || null,
          nova_url_outros || null,
          nova_url_recibo || null,

          // ID do título ao final!
          id,
        ]
      );

      // Gerar e Registar historico:
      let historico = `EDITADO POR: ${normalizeFirstAndLastName(user.nome || "SISTEMA")}.\n`;

      if (valor != titulo.valor) {
        historico += `VALOR: DE: ${normalizeCurrency(titulo.valor)} PARA: ${normalizeCurrency(
          valor
        )}\n`;
      }
      if (descricao != titulo.descricao) {
        historico += `DESCRICAO:\n \t DE: '${titulo.descricao}'\n \tPARA: '${descricao}'\n`;
      }

      if (update_vencimentos) {
        historico += `VENCIMENTOS ANTERIORES:\n `;
        vencimentos_anteriores.forEach((venc_anterior, index) => {
          historico += `\t VENCIMENTO ${index + 1}: \n`;
          historico += `\t DATA VENC.: '${formatDate(
            venc_anterior.data_vencimento,
            "dd/MM/yyyy"
          )}' \n`;
          historico += `\t DATA PREV..: '${formatDate(
            venc_anterior.data_prevista,
            "dd/MM/yyyy"
          )}' \n`;
          historico += `\t VALOR: '${normalizeCurrency(venc_anterior.valor)}' \n`;
        });
      }

      await conn.execute(
        `INSERT INTO fin_cr_titulos_historico (id_titulo, descricao) VALUES (?,?)`,
        [id, historico]
      );
      console.log("FINALIZOU");

      await conn.commit();
      resolve();
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS_A_RECEBER",
        method: "UPDATE",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
};
