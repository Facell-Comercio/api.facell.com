const { format, startOfDay } = require("date-fns");
const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { persistFile } = require("../../../../storage-controller");
const { normalizeFirstAndLastName } = require("../../../../../helpers/mask");

module.exports = async = (req) => {
  return new Promise(async (resolve, reject) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const { user } = req;
      const data = req.body;
      const {
        // Fornecedor
        id_fornecedor,

        // Geral
        // id_tipo_solicitacao,
        id_filial,
        id_grupo_economico,

        valor,
        descricao,

        vencimentos,

        id_rateio,
        itens_rateio,

        url_xml_nota,
        url_nota_fiscal,
        url_nota_debito,
        url_planilha,
        url_txt,
      } = data || {};

      // ^ Validações
      // Titulo
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

      if (!vencimentos || vencimentos.length === 0) {
        throw new Error("Vencimento(s) não informado(s)!");
      }

      // Rateio
      if (!itens_rateio || itens_rateio.length === 0) {
        throw new Error("Campo itens_rateio não informado!");
      }

      // ^ Passamos por cada vencimento, validando os campos
      for (const vencimento of vencimentos) {
        const valorVencimento = parseFloat(vencimento.valor);
        // ^ Validar vencimento se possui todos os campos obrigatórios
        if (!vencimento.data_vencimento) {
          throw new Error(
            `O vencimento não possui data de vencimento! Vencimento: ${JSON.stringify(vencimento)}`
          );
        }
        if (!valorVencimento) {
          throw new Error(`O vencimento não possui valor! Item: ${JSON.stringify(vencimento)}`);
        }
        vencimento.valor = valorVencimento;
      }

      // ^ Passamos por cada item de rateio, validando os campos
      for (const item_rateio of itens_rateio) {
        // ^ Validar vencimento se possui todos os campos obrigatórios
        if (!item_rateio.id_filial) {
          throw new Error(
            `ID Filial não informado para o item de rateio: ${JSON.stringify(item_rateio)}`
          );
        }
        if (!item_rateio.id_centro_custo) {
          throw new Error(
            `ID CENTRO DE CUSTO não informado para o item de rateio: ${JSON.stringify(item_rateio)}`
          );
        }
        if (!item_rateio.id_plano_conta) {
          throw new Error(
            `ID PLANO DE CONTAS não informado para o item de rateio: ${JSON.stringify(item_rateio)}`
          );
        }
        const valorRateio = parseFloat(item_rateio.valor);
        const percentualRateio = parseFloat(item_rateio.percentual);
        if (!valorRateio) {
          throw new Error(
            `Valor não informado para o item de rateio: ${JSON.stringify(item_rateio)}`
          );
        }
        if (!percentualRateio) {
          throw new Error(
            `Percentual não informado para o item de rateio: ${JSON.stringify(item_rateio)}`
          );
        }
        item_rateio.valor = valorRateio;
        item_rateio.percentual = percentualRateio;
      }

      // * Verificar se o Grupo valida orçamento
      const [rowGrupoEconomico] = await conn.execute(
        `SELECT orcamento FROM grupos_economicos WHERE id = ?`,
        [id_grupo_economico]
      );
      const grupoValidaOrcamento =
        rowGrupoEconomico && rowGrupoEconomico[0] && !!+rowGrupoEconomico[0]["orcamento"];

      // * Obter o Orçamento:
      const [rowOrcamento] = await conn.execute(
        `SELECT id, active FROM fin_orcamento WHERE DATE_FORMAT(ref, '%Y-%m') = ? and id_grupo_economico = ?`,
        [format(new Date(), "yyyy-MM"), id_grupo_economico]
      );

      if (grupoValidaOrcamento && (!rowOrcamento || rowOrcamento.length === 0)) {
        throw new Error("Orçamento não localizado!");
      }
      if (rowOrcamento.length > 1) {
        throw new Error(
          `${rowOrcamento.length} orçamentos foram localizados, isso é um erro! Procurar a equipe de desenvolvimento.`
        );
      }
      const orcamentoAtivo = rowOrcamento && rowOrcamento[0] && !!+rowOrcamento[0]["active"];
      const id_orcamento = rowOrcamento && rowOrcamento[0] && rowOrcamento[0]["id"];

      // * Persitir os anexos
      const nova_url_xml = await persistFile({
        fileUrl: url_xml_nota,
      });
      const nova_url_nota_fiscal = await persistFile({
        fileUrl: url_nota_fiscal,
      });
      const nova_url_nota_debito = await persistFile({
        fileUrl: url_nota_debito,
      });
      const nova_url_planilha = await persistFile({ fileUrl: url_planilha });
      const nova_url_txt = await persistFile({
        fileUrl: url_txt,
      });

      // * INÍCIO - Criação do Título a Receber
      const [resultInsertTitulo] = await conn.execute(
        `INSERT INTO fin_cr_titulos
          (
              id_solicitante,
              id_fornecedor,
  
              id_filial,
              
              valor,
              descricao,
              
              id_rateio,
  
              url_xml_nota,
              url_nota_fiscal,
              url_nota_debito,
              url_planilha,
              url_txt,
  
              id_status
          )
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
          `,
        [
          user.id,
          id_fornecedor,

          id_filial,

          valor,
          descricao,

          id_rateio || null,

          nova_url_xml || null,
          nova_url_nota_fiscal || null,
          nova_url_nota_debito || null,
          nova_url_planilha || null,
          nova_url_txt || null,

          10,
        ]
      );

      const newId = resultInsertTitulo.insertId;
      // * FIM - Criação do Título a Receber

      // * INÍCIO - Manipulação de vencimentos
      for (const vencimento of vencimentos) {
        await conn.execute(
          `INSERT INTO fin_cr_titulos_vencimentos (id_titulo, data_vencimento, valor) VALUES (?,?,?)`,
          [newId, startOfDay(vencimento.data_vencimento), vencimento.valor]
        );
      }
      //* FIM - Manipulação de vencimentos

      // * INÍCIO - Persistir o rateio
      for (const item_rateio of itens_rateio) {
        // Validar os campos do item rateio:

        // * Persistir Item Rateio
        await conn.execute(
          `INSERT INTO fin_cr_titulos_rateio (id_titulo, id_filial, id_centro_custo, id_plano_conta, valor, percentual) VALUES (?,?,?,?,?,?)`,
          [
            newId,
            item_rateio.id_filial,
            item_rateio.id_centro_custo,
            item_rateio.id_plano_conta,
            item_rateio.valor,
            item_rateio.percentual,
          ]
        );

        if (orcamentoAtivo && grupoValidaOrcamento) {
          // ^ Vamos validar se orçamento possui saldo:
          // Obter a Conta de Orçamento com o Valor Previsto:
          const [rowOrcamentoConta] = await conn.execute(
            `SELECT id, valor_previsto, active FROM fin_orcamento_contas
              WHERE id_orcamento = ? AND id_centro_custo = ?
              AND id_plano_contas = ?
            `,
            [id_orcamento, item_rateio.id_centro_custo, item_rateio.id_plano_conta]
          );

          if (!rowOrcamentoConta || rowOrcamentoConta.length === 0) {
            throw new Error(
              `Não existe conta no orçamento para ${item_rateio.centro_custo}: ${item_rateio.plano_conta}!`
            );
          }
        }
      }

      // Gerar e Registar historico:
      let historico = `CRIADO POR: ${normalizeFirstAndLastName(user.nome)}.\n`;

      await conn.execute(
        `INSERT INTO fin_cr_titulos_historico (id_titulo, descricao) VALUES (?,?)`,
        [newId, historico]
      );

      await conn.commit();
      resolve({ message: "Sucesso!", id_titulo: newId });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS_A_RECEBER",
        method: "INSERT_ONE",
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
