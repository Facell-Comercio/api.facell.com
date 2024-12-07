const { format, startOfDay } = require("date-fns");
const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

const { checkUserDepartment } = require("../../../../helpers/checkUserDepartment");
const { hasPermission } = require("../../../../helpers/hasPermission");
const {
  normalizeFirstAndLastName,
  normalizeCurrency,
  normalizeNumberOnly,
  normalizeCodigoBarras,
  excelDateToJSDate,
} = require("../../../../helpers/mask");

const { checkCodigoBarras } = require("../../../../helpers/chekers");

module.exports = function importLoteSolicitacoes(req) {
  return new Promise(async (resolve, reject) => {
    const titulos = req.body || [];
    const conn = await db.getConnection();
    if (!titulos.length > 0) {
      throw new Error("Não há nehuma solicitação no arquivo");
    }

    try {
      await conn.beginTransaction();
      const id_status =
        checkUserDepartment(req, "FINANCEIRO") || hasPermission(req, "MASTER") ? 3 : 1;
      const result = [];
      const today = format(new Date(), "yyyyMMdd");

      for (const titulo of titulos) {
        const {
          id_tipo_solicitacao,
          id_forma_pagamento,

          CNPJ_FORNECEDOR: cnpj_fornecedor,
          CNPJ_FILIAL: cnpj_filial,
          CNPJ_FILIAL_RATEIO: cnpj_filial_rateio,

          DATA_EMISSAO: data_emissao,
          DATA_VENCIMENTO: data_vencimento,

          DOCUMENTO: documento,
          DESCRICAO: descricao,
          VALOR: valor,

          CENTRO_CUSTO: centro_custo,
          PLANO_CONTAS: plano_contas,
          CODIGO_BARRAS: codigo_barras,
          PIX_COPIA_COLA: pix_copia_cola,
        } = titulo;
        try {
          if (id_status !== 3 && format(data_vencimento, "yyyyMMdd") < today) {
            throw new Error(`Data de vencimento da solicitação inferior a data atual`);
          }

          //* Consultado os dados do fornecedor
          const [rowFornecedor] = await conn.execute(
            `
            SELECT 
            id, nome, id_tipo_chave_pix, chave_pix, id_banco, 
            agencia, dv_agencia, cnpj_favorecido,
            id_tipo_conta, conta, dv_conta
            FROM fin_fornecedores WHERE cnpj = ?
            `,
            [normalizeNumberOnly(cnpj_fornecedor)]
          );
          const fornecedor = rowFornecedor && rowFornecedor[0];
          if (!fornecedor) {
            throw new Error(`Fornecedor não encontrado!`);
          }

          //* Validações de forma de pagamento e dos dados exigidos para cada uma
          // Se for PIX: Exigir id_tipo_chave_pix e chave_pix
          if (id_forma_pagamento == "4") {
            if (!fornecedor.id_tipo_chave_pix || !fornecedor.chave_pix) {
              throw new Error(
                "Selecionado forma de pagamento PIX mas não informado tipo chave ou chave PIX"
              );
            }
          }
          // Se forma de pagamento for transferência, então exigir os dados bancários
          if (id_forma_pagamento === "5") {
            if (
              !fornecedor.id_banco ||
              !fornecedor.id_tipo_conta ||
              !fornecedor.agencia ||
              !fornecedor.conta
            ) {
              throw new Error("Preencha corretamente os dados bancários!");
            }
          }
          // Código de Barras
          const cod_barras = !!codigo_barras ? normalizeCodigoBarras(codigo_barras) : null;
          if (!!cod_barras && !checkCodigoBarras(cod_barras)) {
            throw new Error(`Linha Digitável inválida: ${cod_barras}`);
          }
          // PIX QR Code
          const qr_code = pix_copia_cola || null;
          if (id_forma_pagamento == "8" && !qr_code) {
            throw new Error("Preencha o PIX Copia e Cola!");
          }

          //* Consultado a Filial
          const [rowFiliais] = await conn.execute(
            `
            SELECT id, id_grupo_economico FROM filiais WHERE cnpj = ?
            `,
            [normalizeNumberOnly(cnpj_filial)]
          );
          const filial = rowFiliais && rowFiliais[0];
          if (!filial) {
            throw new Error(`Filial não encontrada!`);
          }

          //* Consultado a Filial Rateio
          const [rowFiliaisRateios] = await conn.execute(
            `
            SELECT id FROM filiais WHERE cnpj = ?
            `,
            [normalizeNumberOnly(cnpj_filial_rateio)]
          );
          const filialRateio = rowFiliaisRateios && rowFiliaisRateios[0];
          if (!filialRateio) {
            throw new Error(`Filial Rateio não encontrada!`);
          }

          //* Consultando o Centro de Custo
          const [rowCentrosCusto] = await conn.execute(
            `
            SELECT id FROM fin_centros_custo WHERE nome = ? AND id_grupo_economico = ? 
            `,
            [String(centro_custo).toUpperCase(), filial.id_grupo_economico]
          );
          const centroCusto = rowCentrosCusto && rowCentrosCusto[0];
          if (!centroCusto) {
            throw new Error(`Centro de Custo não encontrado!`);
          }

          //* Consultando o Plano de Contas
          const [rowPlanosContas] = await conn.execute(
            `
            SELECT id FROM fin_plano_contas WHERE CONCAT(codigo, " - ",descricao) = ?
            `,
            [String(plano_contas).toUpperCase()]
          );
          const planoContas = rowPlanosContas && rowPlanosContas[0];
          if (!planoContas) {
            throw new Error(`Plano de Contas não encontrado!`);
          }

          // * Verificar se o Grupo valida orçamento
          const [rowGrupoEconomico] = await conn.execute(
            `SELECT orcamento FROM grupos_economicos WHERE id = ?`,
            [filial.id_grupo_economico]
          );
          const grupoValidaOrcamento =
            rowGrupoEconomico && rowGrupoEconomico[0] && !!+rowGrupoEconomico[0]["orcamento"];

          // * Obter o Orçamento:
          const [rowOrcamento] = await conn.execute(
            `SELECT id, active FROM fin_orcamento WHERE DATE_FORMAT(ref, '%Y-%m') = ? and id_grupo_economico = ?`,
            [format(new Date(), "yyyy-MM"), filial.id_grupo_economico]
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

          if (orcamentoAtivo) {
            // ^ Vamos validar se orçamento possui saldo:
            // Obter a Conta de Orçamento com o Valor Previsto:
            const [rowOrcamentoConta] = await conn.execute(
              `SELECT id, valor_previsto, active FROM fin_orcamento_contas 
                WHERE 
                  id_orcamento = ?
                  AND id_centro_custo = ?
                  AND id_plano_contas = ?
                  `,
              [id_orcamento, centroCusto.id, planoContas.id]
            );

            if (!rowOrcamentoConta || rowOrcamentoConta.length === 0) {
              throw new Error(
                `Não existe conta no orçamento para ${centro_custo}: ${plano_contas}!`
              );
            }

            const contaOrcamentoAtiva =
              rowOrcamentoConta && rowOrcamentoConta[0] && !!+rowOrcamentoConta[0]["active"];

            const id_orcamento_conta =
              rowOrcamentoConta && rowOrcamentoConta[0] && rowOrcamentoConta[0]["id"];

            let valor_previsto =
              rowOrcamentoConta && rowOrcamentoConta[0] && rowOrcamentoConta[0]["valor_previsto"];
            valor_previsto = parseFloat(valor_previsto);

            // Obter o Valor Realizado da Conta do Orçamento :
            const [rowConsumoOrcamento] = await conn.execute(
              `SELECT sum(valor) as valor 
                FROM fin_orcamento_consumo 
                WHERE active = true AND id_orcamento_conta = ?`,
              [id_orcamento_conta]
            );
            let valor_total_consumo =
              (rowConsumoOrcamento && rowConsumoOrcamento[0] && rowConsumoOrcamento[0]["valor"]) ||
              0;
            valor_total_consumo = parseFloat(valor_total_consumo);

            // Calcular o saldo da conta do orçamento:
            const saldo = valor_previsto - valor_total_consumo;
            if (contaOrcamentoAtiva && saldo < valor) {
              throw new Error(
                `Saldo insuficiente para ${centro_custo}: ${plano_contas}. Necessário ${normalizeCurrency(
                  valor - saldo
                )}`
              );
            }
          }

          //* Verifica se esse título já existe
          const [rowSolicitacoesDuplicadas] = await conn.execute(
            `
              SELECT id 
              FROM fin_cp_titulos
              WHERE id_filial = ?
              AND descricao = ?
              AND valor = ?
              AND data_emissao = ?
              `,
            [
              filial.id,
              String(descricao).toUpperCase(),
              valor,
              startOfDay(excelDateToJSDate(data_emissao)),
            ]
          );
          if (rowSolicitacoesDuplicadas.length > 0) {
            throw new Error(`A solicitação já existe`);
          }
          //* INSERT do título
          const [resultTitulo] = await conn.execute(
            `
              INSERT INTO fin_cp_titulos (
                id_departamento,
                id_status,
                id_tipo_solicitacao,
                id_fornecedor,
                id_filial,
                id_solicitante,
  
                id_forma_pagamento,
                num_doc,
                data_emissao,
                descricao,
                valor,
  
                cnpj_favorecido,
                id_tipo_chave_pix,
                chave_pix,
                id_banco,
                agencia,
                dv_agencia,
                id_tipo_conta,
                conta,
                dv_conta
              ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
              `,
            [
              req.user.departamentos[0].id_departamento,
              id_status,
              id_tipo_solicitacao,
              fornecedor.id,
              filial.id,
              req.user.id,

              id_forma_pagamento,
              String(documento).toUpperCase(),
              startOfDay(excelDateToJSDate(data_emissao)),
              String(descricao).toUpperCase(),
              valor,

              fornecedor.cnpj_favorecido || null,
              fornecedor.id_tipo_chave_pix || null,
              fornecedor.chave_pix || null,
              fornecedor.id_banco || null,
              fornecedor.agencia || null,
              fornecedor.dv_agencia || null,
              fornecedor.id_tipo_conta || null,
              fornecedor.conta || null,
              fornecedor.dv_conta || null,
            ]
          );

          const idTitulo = resultTitulo.insertId;

          //* INSERT do vencimento
          await conn.execute(
            `INSERT INTO fin_cp_titulos_vencimentos (id_titulo, data_vencimento, data_prevista, cod_barras, valor, qr_code) VALUES (?,?,?,?,?,?)`,
            [
              idTitulo,
              startOfDay(excelDateToJSDate(data_vencimento)),
              calcularDataPrevisaoPagamento(excelDateToJSDate(data_vencimento)),
              cod_barras,
              valor,
              qr_code,
            ]
          );

          //* Criação do histórico
          await conn.execute(
            `INSERT INTO fin_cp_titulos_historico (id_titulo, descricao) VALUES (?,?)`,
            [
              idTitulo,
              `CRIADO POR: ${normalizeFirstAndLastName(req.user.nome)}. LANÇAMENTO EM LOTE\n`,
            ]
          );
          if (id_status === 3) {
            await conn.execute(
              `INSERT INTO fin_cp_titulos_historico (id_titulo, descricao) VALUES (?,?)`,
              [
                idTitulo,
                `APROVADO POR: ${normalizeFirstAndLastName(req.user.nome)}. LANÇAMENTO EM LOTE\n`,
              ]
            );
          }

          //* Criação do item rateio
          await conn.execute(
            `
            INSERT INTO fin_cp_titulos_rateio (id_titulo, id_filial, id_centro_custo, id_plano_conta, valor, percentual)
            VALUES (?,?,?,?,?,?)`,
            [
              idTitulo,
              filialRateio.id, // id_filial
              centroCusto.id,
              planoContas.id,
              valor,
              1.0,
            ]
          );

          result.push({
            ...titulo,
            STATUS: id_status === 3 ? "APROVADO" : "LANÇADO",
            OBSERVAÇÃO: "Importado com sucesso",
          });
        } catch (error) {
          result.push({
            ...titulo,
            STATUS: "ERRO",
            OBSERVAÇÃO: error.message,
          });
        }
      }

      // await conn.commit();
      await conn.rollback();
      resolve(result);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "IMPORT_SOLICITACAO_LOTE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
};
