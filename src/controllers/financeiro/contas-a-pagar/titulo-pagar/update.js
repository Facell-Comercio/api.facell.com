const { format, startOfDay, formatDate } = require("date-fns");
const { db } = require("../../../../../mysql");
const {
  normalizeFirstAndLastName,
  normalizeCurrency,
  normalizeCodigoBarras,
  normalizeDate,
} = require("../../../../helpers/mask");

const { logger } = require("../../../../../logger");
const { checkCodigoBarras } = require("../../../../helpers/chekers");
const { replaceFileUrl } = require("../../../storage-controller");

module.exports = function update(req) {
  return new Promise(async (resolve, reject) => {
    const conn = await db.getConnection();

    try {
      const { user } = req;

      await conn.beginTransaction();
      const data = req.body;
      const {
        id,
        id_filial,
        id_departamento,
        id_grupo_economico,

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
        data_emissao,

        num_doc,
        valor,

        id_tipo_solicitacao,
        descricao,

        update_vencimentos,
        vencimentos,

        update_rateio,
        id_rateio,
        itens_rateio,

        url_nota_fiscal,
        url_xml,
        url_boleto,
        url_contrato,
        url_planilha,
        url_txt,
      } = data || {};
      // console.log('NOVOS_DADOS', novos_dados)
      // console.log(`TITULO ${data.id}: VENCIMENTOS: `,vencimentos)
      // console.log(`TITULO ${data.id}: ITENS_RATEIO: `,itens_rateio)
      const isCartao = id_forma_pagamento == 6;
      // ^ Validações
      // Titulo
      if (!id) {
        throw new Error("ID do título não informado!");
      }
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
      // Se forma de pagamento for cartão, exigir o cartão
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

      // Vencimentos
      if (!vencimentos || vencimentos.length === 0) {
        throw new Error("Campo vencimentos não informado!");
      }

      // Rateio
      if (!itens_rateio || itens_rateio.length === 0) {
        throw new Error("Campo itens_rateio não informado!");
      }

      // Obter dados do Titulo no banco:
      const [rowTitulo] = await conn.execute(
        `SELECT * FROM fin_cp_titulos WHERE id = ?`,
        [id]
      );
      const titulo = rowTitulo && rowTitulo[0];
      if (!titulo) throw new Error("Título não localizado!");

      // ^ Validar se algum vencimento já foi pago, se sim, abortar.
      const [vencimentosPagos] = await conn.execute(
        "SELECT id FROM fin_cp_titulos_vencimentos WHERE id_titulo = ? AND NOT data_pagamento IS NULL",
        [id]
      );
      if (vencimentosPagos && vencimentosPagos.length) {
        throw new Error(
          `Impossível editar a solicitação pois já existem ${vencimentosPagos.length} vencimentos pagos..`
        );
      }

      // ^ Vamos verificar se algum vencimento está em bordero, se estiver, vamos impedir a alteração:
      const [vencimentosEmBordero] = await conn.execute(
        `SELECT tb.id FROM fin_cp_bordero_itens tb 
          INNER JOIN fin_cp_titulos_vencimentos tv ON tv.id = tb.id_vencimento 
          WHERE tv.id_titulo = ?`,
        [id]
      );
      if (vencimentosEmBordero && vencimentosEmBordero.length > 0) {
        throw new Error(
          `Você não pode alterar a solicitação pois ${vencimentosEmBordero.length} vencimentos já estão em bordero de pagamento.`
        );
      }

      // ^ Vamos validar se algum vencimento está em fatura fechada, se estiver, vamos abortar:
      if (isCartao) {
        const [vencimentosEmFaturaFechada] = await conn.execute(
          `SELECT cf.id FROM fin_cp_titulos_vencimentos tv
                    INNER JOIN fin_cartoes_corporativos_faturas cf ON cf.id = tv.id_fatura
                    WHERE cf.closed AND tv.id_titulo = ?`,
          [id]
        );
        if (
          vencimentosEmFaturaFechada &&
          vencimentosEmFaturaFechada.length > 0
        ) {
          throw new Error(
            `Você não pode alterar a solicitação pois ${vencimentosEmFaturaFechada.length} vencimentos já estão em fatura de cartão fechada.`
          );
        }
      }

      // Obter os Vencimentos anteriores para registra-los no histórico caso precise
      const [vencimentos_anteriores] = await conn.execute(
        `SELECT tv.*
                    FROM fin_cp_titulos_vencimentos tv
                    WHERE tv.id_titulo = ?`,
        [titulo.id]
      );

      // * Verificar se o Grupo valida orçamento
      const [rowGrupoEconomico] = await conn.execute(
        `SELECT orcamento FROM grupos_economicos WHERE id = ?`,
        [id_grupo_economico]
      );
      const grupoValidaOrcamento =
        rowGrupoEconomico &&
        rowGrupoEconomico[0] &&
        !!+rowGrupoEconomico[0]["orcamento"];

      // * Obter o Orçamento:
      const [rowOrcamento] = await conn.execute(
        `SELECT id, active FROM fin_orcamento WHERE DATE_FORMAT(ref, '%Y-%m') = ? and id_grupo_economico = ?`,
        [format(titulo.created_at, "yyyy-MM"), id_grupo_economico]
      );

      if (
        grupoValidaOrcamento &&
        (!rowOrcamento || rowOrcamento.length === 0)
      ) {
        throw new Error("Orçamento não localizado!");
      }
      if (rowOrcamento.length > 1) {
        throw new Error(
          `${rowOrcamento.length} orçamentos foram localizados, isso é um erro! Procurar a equipe de desenvolvimento.`
        );
      }

      const orcamentoAtivo =
        rowOrcamento && rowOrcamento[0] && !!+rowOrcamento[0]["active"];
      const id_orcamento =
        rowOrcamento && rowOrcamento[0] && rowOrcamento[0]["id"];

      // ~ Início de Manipulação de Rateio //////////////////////
      // * Validação de orçamento e atualização do rateio
      let id_orcamento_conta;
      if (update_rateio) {
        if (!id_orcamento && grupoValidaOrcamento) {
          throw new Error("Orçamento não localizado!");
        }

        // ! Excluir Antigo rateio
        await conn.execute(
          `DELETE FROM fin_cp_titulos_rateio WHERE id_titulo = ?`,
          [id]
        );

        // * Persistir o rateio
        for (const item_rateio of itens_rateio) {
          const valorRateio = parseFloat(item_rateio.valor);
          if (!valorRateio) {
            throw new Error(
              `O Rateio não possui Valor! Rateio: ${JSON.stringify(
                item_rateio
              )}`
            );
          }
          if (!item_rateio.id_filial) {
            throw new Error(
              `O Rateio não possui Filial! Rateio: ${JSON.stringify(
                item_rateio
              )}`
            );
          }
          if (!item_rateio.id_centro_custo) {
            throw new Error(
              `O Rateio não possui Centro de custo! Rateio: ${JSON.stringify(
                item_rateio
              )}`
            );
          }
          if (!item_rateio.id_plano_conta) {
            throw new Error(
              `O Rateio não possui Plano de contas! Rateio: ${JSON.stringify(
                item_rateio
              )}`
            );
          }

          // ! Excluir o consumo do orçamento pelo titulo
          await conn.execute(
            `DELETE FROM fin_orcamento_consumo 
                            WHERE id_item_rateio IN (
                                SELECT id FROM fin_cp_titulos_rateio WHERE id_titulo = ?
                            )`,
            [id]
          );

          if (orcamentoAtivo) {
            // ^ Vamos validar se orçamento possui saldo:
            // Obter a Conta de Orçamento com o Valor Previsto [orçado]:
            const [rowOrcamentoConta] = await conn.execute(
              `SELECT id, valor_previsto, active FROM fin_orcamento_contas 
                                WHERE 
                                id_orcamento = ?
                                AND id_centro_custo = ?
                                AND id_plano_contas = ?
                                `,
              [
                id_orcamento,
                item_rateio.id_centro_custo,
                item_rateio.id_plano_conta,
              ]
            );

            if (!rowOrcamentoConta || rowOrcamentoConta.length === 0) {
              throw new Error(
                `Não existe conta no orçamento para o ${item_rateio.centro_custo} + ${item_rateio.plano_conta}!`
              );
            }

            const contaOrcamentoAtiva =
              rowOrcamentoConta &&
              rowOrcamentoConta[0] &&
              !!+rowOrcamentoConta[0]["active"];

            id_orcamento_conta =
              rowOrcamentoConta &&
              rowOrcamentoConta[0] &&
              rowOrcamentoConta[0]["id"];
            let valor_previsto =
              rowOrcamentoConta &&
              rowOrcamentoConta[0] &&
              rowOrcamentoConta[0]["valor_previsto"];
            valor_previsto = parseFloat(valor_previsto);

            // Obter o Valor Realizado da Conta do Orçamento:
            const [rowConsumoOrcamento] = await conn.execute(
              `SELECT sum(valor) as valor 
                            FROM fin_orcamento_consumo 
                            WHERE active = true AND id_orcamento_conta = ?`,
              [id_orcamento_conta]
            );
            let valor_total_consumo =
              (rowConsumoOrcamento &&
                rowConsumoOrcamento[0] &&
                rowConsumoOrcamento[0]["valor"]) ||
              0;
            valor_total_consumo = parseFloat(valor_total_consumo);

            // Calcular o saldo da conta do orçamento:
            const saldo = valor_previsto - valor_total_consumo;
            if (contaOrcamentoAtiva && saldo < valorRateio) {
              throw new Error(
                `Saldo insuficiente para ${item_rateio.centro_custo} + ${
                  item_rateio.plano_conta
                }. Necessário ${normalizeCurrency(valorRateio - saldo)}`
              );
            }
          } // fim da validação do orçamento;

          const [result] = await conn.execute(
            `INSERT INTO fin_cp_titulos_rateio (id_titulo, id_filial, id_centro_custo, id_plano_conta, percentual, valor) VALUES (?,?,?,?,?,?)`,
            [
              id,
              item_rateio.id_filial,
              item_rateio.id_centro_custo,
              item_rateio.id_plano_conta,
              item_rateio.percentual,
              valorRateio,
            ]
          );
          if (id_orcamento_conta) {
            // * Persistir a conta de consumo do orçamento:
            await conn.execute(
              `INSERT INTO fin_orcamento_consumo (id_orcamento_conta, id_item_rateio, valor) VALUES (?,?,?)`,
              [id_orcamento_conta, result.insertId, valorRateio]
            );
          }
        }
      }
      // ~ Fim de Manipulação de Rateio //////////////////////

      // * Manipulação de vencimentos - caso update_vencimentos = true //////////////////////
      if (update_vencimentos) {
        // ! Excluir Antigos Vencimentos
        await conn.execute(
          `DELETE FROM fin_cp_titulos_vencimentos WHERE id_titulo = ?`,
          [id]
        );

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
          if (!vencimento.data_prevista) {
            throw new Error(
              `O vencimento não possui data prevista para pagamento! Vencimento: ${JSON.stringify(
                vencimento
              )}`
            );
          }
          if (!valorVencimento) {
            throw new Error(
              `O vencimento não possui valor! Item: ${JSON.stringify(
                vencimento
              )}`
            );
          }

          // * Persistir o vencimento
          // Código de Barras
          const cod_barras = !!vencimento.cod_barras
            ? normalizeCodigoBarras(vencimento.cod_barras)
            : null;
          if (
            id_forma_pagamento == "1" &&
            !!vencimento.cod_barras &&
            !checkCodigoBarras(cod_barras)
          ) {
            throw new Error(`Linha Digitável inválida: ${cod_barras}`);
          }
          // PIX QR Code
          const qr_code = vencimento.qr_code || null;
          if (id_forma_pagamento == "8" && !qr_code) {
            throw new Error("Preencha o PIX Copia e Cola!");
          }

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
            if (
              parseInt(cartao.dia_vencimento) !==
              new Date(vencimento.data_vencimento).getDate()
            ) {
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
                  `A fatura de data vencimento ${normalizeDate(
                    startOfDay(vencimento.data_vencimento)
                  )} já está fechada!`
                );
              }
              const valor =
                parseFloat(fatura.valor) + parseFloat(vencimento.valor);
              await conn.execute(
                `UPDATE fin_cartoes_corporativos_faturas SET valor = ? + valor WHERE id = ?
                                `,
                [valor, fatura.id]
              );
              id_fatura = fatura.id;
            }

            //* Caso não exista uma fatura -> Cria uma nova
            if (!fatura) {
              const [result] = await conn.execute(
                `INSERT INTO fin_cartoes_corporativos_faturas
                                (id_cartao, data_vencimento, data_prevista, valor)
                                VALUES (?,?,?,?)
                                `,
                [
                  id_cartao,
                  startOfDay(vencimento.data_vencimento),
                  startOfDay(vencimento.data_prevista),
                  vencimentos[0].valor,
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
            `INSERT INTO fin_cp_titulos_vencimentos (id_titulo, data_vencimento, data_prevista, valor, cod_barras, qr_code, id_fatura) VALUES (?,?,?,?,?,?,?)`,
            [
              id,
              formatDate(vencimento.data_vencimento, "yyyy-MM-dd"),
              formatDate(vencimento.data_prevista, "yyyy-MM-dd"),
              valorVencimento,
              cod_barras,
              qr_code,
              id_fatura,
            ]
          );
        }
      }
      //~ Fim de manipulação de vencimentos //////////////////////

      // Persitir os anexos, remover os antigos:
      const nova_url_nota_fiscal = await replaceFileUrl({
        oldFileUrl: titulo.url_nota_fiscal,
        newFileUrl: url_nota_fiscal,
      });
      const nova_url_xml = await replaceFileUrl({
        oldFileUrl: titulo.url_xml,
        newFileUrl: url_xml,
      });
      const nova_url_boleto = await replaceFileUrl({
        oldFileUrl: titulo.url_boleto,
        newFileUrl: url_boleto,
      });
      const nova_url_contrato = await replaceFileUrl({
        oldFileUrl: titulo.url_contrato,
        newFileUrl: url_contrato,
      });
      const nova_url_planilha = await replaceFileUrl({
        oldFileUrl: titulo.url_planilha,
        newFileUrl: url_planilha,
      });
      const nova_url_txt = await replaceFileUrl({
        oldFileUrl: titulo.url_txt,
        newFileUrl: url_txt,
      });

      // Persistir novos dados do Titulo
      await conn.execute(
        `UPDATE fin_cp_titulos 
                SET
                id_fornecedor = ?,
                id_banco = ?,
                id_forma_pagamento = ?,
        
                agencia = ?,
                dv_agencia = ?,
                id_tipo_conta = ?,
                conta = ?,
                dv_conta = ?,
                favorecido = ?,
                cnpj_favorecido = ?,
        
                id_tipo_chave_pix = ?,
                chave_pix = ?,
                id_cartao = ?,
        
                id_tipo_solicitacao = ?,
                id_filial = ?,
                id_departamento = ?,
                
                data_emissao = ?,
                num_doc = ?,
                valor = ?,
                descricao = ?,
                
                id_rateio = ?,
        
                url_nota_fiscal = ?,
                url_xml = ?,
                url_boleto = ?,
                url_contrato = ?,
                url_planilha = ?,
                url_txt = ?,
        
                updated_at = current_timestamp()
        
                WHERE id = ?
                `,
        [
          id_fornecedor,
          id_banco || null,
          id_forma_pagamento,

          agencia || null,
          dv_agencia,
          id_tipo_conta || null,
          conta || null,
          dv_conta,
          favorecido || null,
          cnpj_favorecido || null,

          id_tipo_chave_pix || null,
          chave_pix || null,
          id_forma_pagamento === "6" ? id_cartao : null,

          id_tipo_solicitacao,
          id_filial,
          id_departamento,

          startOfDay(data_emissao),
          num_doc || null,
          valor,
          descricao,

          id_rateio || null,

          nova_url_nota_fiscal || null,
          nova_url_xml || null,
          nova_url_boleto || null,
          nova_url_contrato || null,
          nova_url_planilha || null,
          nova_url_txt || null,

          // ID do título ao final!
          id,
        ]
      );

      // Gerar e Registar historico:
      let historico = `EDITADO POR: ${normalizeFirstAndLastName(user.nome)}.\n`;

      if (valor != titulo.valor) {
        historico += `VALOR: DE: ${normalizeCurrency(
          titulo.valor
        )} PARA: ${normalizeCurrency(valor)}\n`;
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
          historico += `\t VALOR: '${normalizeCurrency(
            venc_anterior.valor
          )}' \n`;
        });
      }

      await conn.execute(
        `INSERT INTO fin_cp_titulos_historico (id_titulo, descricao) VALUES (?,?)`,
        [id, historico]
      );

      await conn.commit();
      resolve();
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "UPDATE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
};
