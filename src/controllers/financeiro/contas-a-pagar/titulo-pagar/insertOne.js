const { format, startOfDay, addMonths, formatDate, isBefore } = require("date-fns");
const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

const { checkUserDepartment } = require("../../../../helpers/checkUserDepartment");
const { checkCodigoBarras } = require("../../../../helpers/chekers");

const {
  normalizeFirstAndLastName,
  normalizeCurrency,
  normalizeCodigoBarras,
  normalizeDate,
  normalizeCodigoBarras48,
} = require("../../../../helpers/mask");

const { persistFile } = require("../../../storage-controller");
const { hasPermission } = require("../../../../helpers/hasPermission");

module.exports = function insertOne(req) {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      conn = await db.getConnection();
      await conn.beginTransaction();

      const isMaster = hasPermission(req, ["MASTER"]) || checkUserDepartment(req, "FINANCEIRO");

      const { user } = req;
      const data = req.body;
      const {
        id_recorrencia,

        // Fornecedor
        id_fornecedor,
        id_forma_pagamento,
        favorecido,
        cnpj_favorecido,
        id_tipo_chave_pix,
        chave_pix,
        id_cartao,

        id_banco,

        agencia,
        dv_agencia,
        id_tipo_conta,
        conta,
        dv_conta,

        // Geral
        id_tipo_solicitacao,
        id_filial,
        id_departamento,
        id_grupo_economico,
        id_matriz,

        data_emissao,

        num_doc,
        valor,
        descricao,

        vencimentos,

        id_rateio,
        itens_rateio,

        url_nota_fiscal,
        url_xml,
        url_boleto,
        url_contrato,
        url_planilha,
        url_txt,
      } = data || {};

      const isCartao = id_forma_pagamento == 6;
      // console.log('NOVOS_DADOS', novos_dados)
      // console.log(`TITULO ${data.id}: VENCIMENTOS: `,vencimentos)
      // console.log(`TITULO ${data.id}: ITENS_RATEIO: `,itens_rateio)

      // ^ Validações
      // Titulo
      if (!id_filial) {
        throw new Error("Campo id_filial não informado!");
      }
      if (!id_departamento) {
        throw new Error("Campo id_departamento não informado!");
      }
      if (!id_grupo_economico) {
        throw new Error("Campo id_grupo_economico não informado!");
      }
      if (!id_fornecedor) {
        throw new Error("Campo id_fornecedor não informado!");
      }
      if (!id_forma_pagamento) {
        throw new Error("Campo id_forma_pagamento não informado!");
      }
      if (!descricao) {
        throw new Error("Campo Descrição não informado!");
      }
      if (!data_emissao) {
        throw new Error("Campo data_emissao não informado!");
      }

      // Se for PIX: Exigir id_tipo_chave_pix e chave_pix
      if (id_forma_pagamento === "4") {
        if (!id_tipo_chave_pix || !chave_pix) {
          throw new Error(
            "Selecionado forma de pagamento PIX mas não informado tipo chave ou chave PIX"
          );
        }
      }
      // Se forma de pagamento for transferência, então exigir os dados bancários
      if (id_forma_pagamento === "5") {
        if (!id_banco || !id_tipo_conta || !agencia || !conta) {
          throw new Error("Preencha corretamente os dados bancários!");
        }
      }
      if (id_forma_pagamento === "6") {
        if (!id_cartao) {
          throw new Error("Defina qual o cartão do pagamento!");
        }
      }

      // Se tipo solicitação for Com nota, exigir anexos
      if (id_tipo_solicitacao === "1") {
        if (!url_nota_fiscal) {
          throw new Error("Faça o upload da Nota Fiscal!");
        }
      } else if (id_tipo_solicitacao === "4") {
        if (!url_boleto) {
          throw new Error("Faça o upload do Boleto!");
        }
      } else {
        if (!url_contrato) {
          throw new Error("Faça o upload do Contrato/Autorização!");
        }
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
        if (!isMaster && isBefore(new Date(vencimento.data_vencimento, new Date()))) {
          throw new Error(
            `A data de vencimento do vencimento não pode ser anterior ao dia de hoje! Vencimento: ${JSON.stringify(
              vencimento
            )}`
          );
        }
        if (!vencimento.data_prevista) {
          throw new Error(
            `O vencimento não possui data prevista para pagamento! Vencimento: ${JSON.stringify(
              vencimento
            )}`
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
      const nova_url_nota_fiscal = await persistFile({
        fileUrl: url_nota_fiscal,
      });
      const nova_url_xml = await persistFile({
        fileUrl: url_xml,
      });
      const nova_url_boleto = await persistFile({
        fileUrl: url_boleto,
      });
      const nova_url_contrato = await persistFile({ fileUrl: url_contrato });
      const nova_url_planilha = await persistFile({ fileUrl: url_planilha });
      const nova_url_txt = await persistFile({
        fileUrl: url_txt,
      });

      // * Criação do Título a Pagar
      const [resultInsertTitulo] = await conn.execute(
        `INSERT INTO fin_cp_titulos 
                    (
                        id_solicitante,
                        id_fornecedor,
                        id_banco,
                        id_forma_pagamento,
            
                        agencia,
                        dv_agencia,
                        id_tipo_conta,
                        conta,
                        dv_conta,
                        favorecido,
                        cnpj_favorecido,
            
                        id_tipo_chave_pix,
                        chave_pix,
                        id_cartao,
            
                        id_tipo_solicitacao,
                        id_filial,
                        id_departamento,
                        
                        data_emissao,
                        num_doc,
                        valor,
                        descricao,
                        
                        id_rateio,
            
                        url_nota_fiscal,
                        url_xml,
                        url_boleto,
                        url_contrato,
                        url_planilha,
                        url_txt,
            
                        id_status
                    )
            
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                    `,
        [
          user.id,
          id_fornecedor,
          id_banco || null,
          id_forma_pagamento,

          agencia || null,
          dv_agencia || null,
          id_tipo_conta || null,
          conta || null,
          dv_conta || null,
          favorecido || null,
          cnpj_favorecido,

          id_tipo_chave_pix || null,
          chave_pix || null,
          id_cartao || null,

          id_tipo_solicitacao,
          id_filial,
          id_departamento,

          startOfDay(data_emissao),
          num_doc,
          valor,
          descricao,

          id_rateio || null,

          nova_url_nota_fiscal || null,
          nova_url_xml || null,
          nova_url_boleto || null,
          nova_url_contrato || null,
          nova_url_planilha || null,
          nova_url_txt || null,

          checkUserDepartment(req, "FINANCEIRO") ? 3 : 1,
        ]
      );

      const newId = resultInsertTitulo.insertId;
      // ~ Fim da criação do Título ////////////

      // * Atualizar recorrência
      if (id_recorrencia) {
        await conn.execute(`UPDATE fin_cp_titulos_recorrencias SET lancado = true WHERE id = ?`, [
          id_recorrencia,
        ]);
        await conn.execute(
          `INSERT INTO fin_cp_titulos_recorrencias (id_user, id_titulo, data_vencimento, valor) VALUES (?, ?, ?, ?)`,
          [user.id, newId, addMonths(new Date(vencimentos[0].data_vencimento), 1), valor]
        );
      }

      // * Salvar os novos vencimentos
      for (const vencimento of vencimentos) {
        // * Persistir o vencimento do titulo e obter o id:

        //* Código de Barras
        let cod_barras = vencimento.cod_barras;
        if (id_forma_pagamento == "10" || id_forma_pagamento == "11") {
          // console.log("Código de Barras");
          cod_barras = normalizeCodigoBarras48(vencimento.cod_barras);
        } else {
          cod_barras = normalizeCodigoBarras(vencimento.cod_barras);
        }

        if (
          !!cod_barras &&
          id_forma_pagamento != "10" &&
          id_forma_pagamento != "11" &&
          !checkCodigoBarras(cod_barras)
        ) {
          throw new Error(`Linha Digitável inválida: ${cod_barras}`);
        }

        // //* PIX QR Code
        const qr_code = vencimento.qr_code || null;
        // if (id_forma_pagamento == "8" && !qr_code) {
        //   throw new Error("Preencha o PIX Copia e Cola!");
        // }

        //* Início - Lógica de Cartões /////////////////
        let id_fatura = null;
        if (isCartao) {
          //* Consulta alguns dados do cartão e data de vencimento
          const [rowCartoes] = await conn.execute(
            `SELECT dia_vencimento, dia_corte FROM fin_cartoes_corporativos WHERE id = ?`,
            [id_cartao]
          );
          const cartao = rowCartoes && rowCartoes[0];
          if (!cartao) {
            throw new Error("Cartão corporativo não encontrado!");
          }
          if (parseInt(cartao.dia_vencimento) !== new Date(vencimento.data_vencimento).getDate()) {
            throw new Error("Dia de Vencimento inválido!");
          }
          //* Consulta alguns dados da fatura
          const [rowFaturas] = await conn.execute(
            `
              SELECT id, valor, closed FROM fin_cartoes_corporativos_faturas 
              WHERE id_cartao = ? AND data_vencimento = ?
            `,
            [id_cartao, startOfDay(vencimento.data_vencimento)]
          );
          const fatura = rowFaturas && rowFaturas[0];

          //* Caso exista uma fatura -> Atualiza o valor
          if (fatura) {
            //* Verifica se a fatura está fechada
            if (fatura.closed) {
              throw new Error(
                `A fatura de data vencimento ${formatDate(
                  startOfDay(vencimento.data_vencimento),
                  "dd/MM/yyyy"
                )} já está fechada!`
              );
            }
            id_fatura = fatura.id;
          }

          //* Caso não exista uma fatura -> Cria uma nova
          if (!fatura) {
            const [result] = await conn.execute(
              `
                            INSERT INTO fin_cartoes_corporativos_faturas
                            (id_cartao, data_vencimento, data_prevista, valor)
                            VALUES (?,?,?,?)
                            `,
              [
                id_cartao,
                startOfDay(vencimento.data_vencimento),
                startOfDay(vencimento.data_prevista),
                vencimento.valor,
              ]
            );
            if (!result.insertId) {
              throw new Error("Falha ao inserir fatura!");
            }
            id_fatura = result.insertId;
          }
        }
        //* Fim - Lógica de Cartões /////////////////

        await conn.execute(
          `INSERT INTO fin_cp_titulos_vencimentos (id_titulo, data_vencimento, data_prevista, cod_barras, valor, qr_code, id_fatura) VALUES (?,?,?,?,?,?,?)`,
          [
            newId,
            startOfDay(vencimento.data_vencimento),
            startOfDay(vencimento.data_prevista),
            cod_barras,
            vencimento.valor,
            qr_code,
            id_fatura,
          ]
        );
      }
      //~ Fim de manipulação de vencimentos //////////////////////

      // * Persistir o rateio
      for (const item_rateio of itens_rateio) {
        // Validar os campos do item rateio:

        // * Persistir Item Rateio
        const [resultInsertItemRateio] = await conn.execute(
          `INSERT INTO fin_cp_titulos_rateio (id_titulo, id_filial, id_centro_custo, id_plano_conta, valor, percentual) VALUES (?,?,?,?,?,?)`,
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
                            WHERE 
                            id_orcamento = ?
                            AND id_centro_custo = ?
                            AND id_plano_contas = ?
                            `,
            [id_orcamento, item_rateio.id_centro_custo, item_rateio.id_plano_conta]
          );

          if (!rowOrcamentoConta || rowOrcamentoConta.length === 0) {
            throw new Error(
              `Não existe conta no orçamento para ${item_rateio.centro_custo}: ${item_rateio.plano_conta}!`
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
            (rowConsumoOrcamento && rowConsumoOrcamento[0] && rowConsumoOrcamento[0]["valor"]) || 0;
          valor_total_consumo = parseFloat(valor_total_consumo);

          // Calcular o saldo da conta do orçamento:
          const saldo = valor_previsto - valor_total_consumo;
          if (contaOrcamentoAtiva && saldo < item_rateio.valor) {
            throw new Error(
              `Saldo insuficiente para ${item_rateio.centro_custo}: ${
                item_rateio.plano_conta
              }. Necessário ${normalizeCurrency(item_rateio.valor - saldo)}`
            );
          }

          // * Persistir a conta de consumo do orçamento:
          await conn.execute(
            `INSERT INTO fin_orcamento_consumo (id_orcamento_conta, id_item_rateio, valor) VALUES (?,?,?)`,
            [id_orcamento_conta, resultInsertItemRateio.insertId, item_rateio.valor]
          );
        }
      }

      // Gerar e Registar historico:
      let historico = `CRIADO POR: ${normalizeFirstAndLastName(user.nome)}.\n`;

      await conn.execute(
        `INSERT INTO fin_cp_titulos_historico (id_titulo, descricao) VALUES (?,?)`,
        [newId, historico]
      );

      await conn.commit();
      resolve({ message: "Sucesso!", id_titulo: newId });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "INSERT_ONE",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
