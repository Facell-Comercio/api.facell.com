const { formatDate } = require("date-fns");
const { db } = require("../../../../../mysql");
const {
  removeSpecialCharactersAndAccents,
  normalizeNumberOnly,
  normalizeURLChaveEnderecamentoPIX,
} = require("../../../../helpers/mask");
const {
  createHeaderArquivo,
  createHeaderLote,
  createSegmentoA,
  createTrailerLote,
  createTrailerArquivo,
  createSegmentoB,
  createSegmentoJ,
  createSegmentoJ52Pix,
  createSegmentoJ52,
} = require("../../remessa/to-string/itau");
const { normalizeValue } = require("../../remessa/to-string/masks");
const { logger } = require("../../../../../logger");

module.exports = function exportRemessaOLD(req, res) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const { isPix } = req.query;
    const conn = await db.getConnection();

    try {
      if (!id) {
        throw new Error("ID do Borderô não indicado!");
      }
      await conn.beginTransaction();

      const [rowsBordero] = await conn.execute(
        `
        SELECT
          f.cnpj as cnpj_empresa,
          cb.agencia, cb.dv_agencia, cb.conta, cb.dv_conta,
          f.razao as empresa_nome, f.logradouro as endereco_empresa,
          f.numero as endereco_num, f.complemento as endereco_compl,
          f.municipio as cidade, f.cep, f.uf,
          cb.descricao as conta_bancaria, b.data_pagamento, fb.codigo as codigo_bancario
        FROM fin_cp_bordero b
        LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
        LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
        LEFT JOIN filiais f ON f.id = cb.id_filial
        WHERE b.id = ?
      `,
        [id]
      );
      const borderoData = rowsBordero && rowsBordero[0];

      //* Verifica se é CPF ou CNPJ
      const empresa_tipo_insc = borderoData.cnpj_empresa.length === 11 ? 1 : 2;

      //* Verificação de permissão de geração de remessa~
      if (+borderoData.codigo_bancario !== 341) {
        throw new Error(
          "A Remessa não pode ser gerada por não ser do banco Itaú"
        );
      }

      //* Consulta das formas de pagamento *//
      // console.time("FORMA DE PAGAMENTO"); // TESTANDO PERFORMANCE
      const [
        rowsPagamentoCorrenteItau,
        rowsPagamentoPoupancaItau,
        rowsPagamentoCorrenteMesmaTitularidade,
        rowsPagamentoTEDOutroTitular,
        rowsPagamentoTEDMesmoTitular,
        rowsPagamentoPIX,
        rowsPagamentoBoletoItau,
        rowsPagamentoBoletoOutroBancoParaItau,
        rowsPagamentoPIXQRCode,
      ] = await Promise.all([
        //* Pagamento Corrente Itaú
        conn
          .execute(
            `
        SELECT
          tv.id as id_vencimento
        FROM fin_cp_titulos_vencimentos tv
        LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id
        LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero
        LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
        LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
        LEFT JOIN filiais f ON f.id = t.id_filial
        LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
        LEFT JOIN fin_bancos fb ON fb.id = forn.id_banco
        WHERE tb.id_bordero = ?
        AND t.id_forma_pagamento = 5
        AND forn.cnpj <> f.cnpj
        AND fb.codigo = 341
        AND (forn.id_tipo_conta = 1 OR forn.id_tipo_conta IS NULL)
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
      `,
            [id]
          )
          .then(([rows]) => rows),

        //* Pagamento Poupança Itaú
        conn
          .execute(
            `
        SELECT
          tv.id as id_vencimento
        FROM fin_cp_titulos_vencimentos tv
        LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id
        LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero
        LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
        LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
        LEFT JOIN filiais f ON f.id = t.id_filial
        LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
        LEFT JOIN fin_bancos fb ON fb.id = forn.id_banco
        WHERE tb.id_bordero = ?
        AND t.id_forma_pagamento = 5
        AND forn.cnpj <> f.cnpj
        AND fb.codigo = 341
        AND forn.id_tipo_conta = 2
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
      `,
            [id]
          )
          .then(([rows]) => rows),

        //* Pagamento Corrente Mesma Titularidade
        conn
          .execute(
            `
        SELECT
          tv.id as id_vencimento
        FROM fin_cp_titulos_vencimentos tv
        LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id
        LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero
        LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
        LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
        LEFT JOIN filiais f ON f.id = t.id_filial
        LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
        LEFT JOIN fin_bancos fb ON fb.id = forn.id_banco
        WHERE tb.id_bordero = ?
        AND t.id_forma_pagamento = 5
        AND forn.cnpj = f.cnpj
        AND fb.codigo = 341
        AND (forn.id_tipo_conta = 1 OR forn.id_tipo_conta IS NULL)
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
      `,
            [id]
          )
          .then(([rows]) => rows),

        //* Pagamento TED Outro Titular
        conn
          .execute(
            `
        SELECT
          tv.id as id_vencimento
        FROM fin_cp_titulos_vencimentos tv
        LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id
        LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero
        LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
        LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
        LEFT JOIN filiais f ON f.id = t.id_filial
        LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
        LEFT JOIN fin_bancos fb ON fb.id = forn.id_banco
        WHERE tb.id_bordero = ?
        AND t.id_forma_pagamento = 5
        AND forn.cnpj <> f.cnpj
        AND fb.codigo <> 341
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
      `,
            [id]
          )
          .then(([rows]) => rows),

        //* Pagamento TED Mesmo Titular
        conn
          .execute(
            `
        SELECT
          tv.id as id_vencimento
        FROM fin_cp_titulos_vencimentos tv
        LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id
        LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero
        LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
        LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
        LEFT JOIN filiais f ON f.id = t.id_filial
        LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
        LEFT JOIN fin_bancos fb ON fb.id = forn.id_banco
        WHERE tb.id_bordero = ?
        AND t.id_forma_pagamento = 5
        AND forn.cnpj = f.cnpj
        AND fb.codigo <> 341
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
      `,
            [id]
          )
          .then(([rows]) => rows),

        //* Pagamento PIX
        conn
          .execute(
            `
        SELECT
          tv.id as id_vencimento
        FROM fin_cp_titulos_vencimentos tv
        LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id
        LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero
        LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
        LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
        LEFT JOIN filiais f ON f.id = t.id_filial
        LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
        LEFT JOIN fin_bancos fb ON fb.id = forn.id_banco
        WHERE tb.id_bordero = ?
        AND t.id_forma_pagamento = 4
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
      `,
            [id]
          )
          .then(([rows]) => rows),

        //* Pagamento Boleto Itaú
        conn
          .execute(
            `
        SELECT
          tv.id as id_vencimento
        FROM fin_cp_titulos_vencimentos tv
        LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id
        LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero
        LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
        LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
        LEFT JOIN filiais f ON f.id = t.id_filial
        LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
        LEFT JOIN fin_dda dda ON dda.id_vencimento = tv.id
        WHERE tb.id_bordero = ?
        AND t.id_forma_pagamento = 1
        AND (LEFT(COALESCE(dda.cod_barras, ''), 3) = 341 OR LEFT(COALESCE(tv.cod_barras, ''), 3) = 341)
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
      `,
            [id]
          )
          .then(([rows]) => rows),
        //* Pagamento Boleto Outro Banco Para Itaú
        conn
          .execute(
            `
        SELECT
          tv.id as id_vencimento
        FROM fin_cp_titulos_vencimentos tv
        LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id
        LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero
        LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
        LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
        LEFT JOIN filiais f ON f.id = t.id_filial
        LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
        LEFT JOIN fin_dda dda ON dda.id_vencimento = tv.id
        WHERE tb.id_bordero = ?
        AND t.id_forma_pagamento = 1
        AND (LEFT(dda.cod_barras, 3) <> 341 OR LEFT(tv.cod_barras, 3) <> 341)
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
      `,
            [id]
          )
          .then(([rows]) => rows),

        //* Pagamento PIX QR Code
        conn
          .execute(
            `
        SELECT
          tv.id as id_vencimento
        FROM fin_cp_titulos_vencimentos tv
        LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id
        LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero
        LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
        LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
        LEFT JOIN filiais f ON f.id = t.id_filial
        LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
        LEFT JOIN fin_bancos fb ON fb.id = forn.id_banco
        WHERE tb.id_bordero = ?
        AND t.id_forma_pagamento = 8
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
      `,
            [id]
          )
          .then(([rows]) => rows),
      ]);

      let formasPagamento;

      if (isPix) {
        formasPagamento = new Map(
          Object.entries({
            PagamentoPIX: rowsPagamentoPIX,
            PagamentoPIXQRCode: rowsPagamentoPIXQRCode,
          })
        );
      } else {
        formasPagamento = new Map(
          Object.entries({
            PagamentoCorrenteItau: rowsPagamentoCorrenteItau,
            PagamentoPoupancaItau: rowsPagamentoPoupancaItau,
            PagamentoCorrenteMesmaTitularidade:
              rowsPagamentoCorrenteMesmaTitularidade,
            PagamentoTEDOutroTitular: rowsPagamentoTEDOutroTitular,
            PagamentoTEDMesmoTitular: rowsPagamentoTEDMesmoTitular,
            PagamentoBoletoItau: rowsPagamentoBoletoItau,
            PagamentoBoletoOutroBancoParaItau:
              rowsPagamentoBoletoOutroBancoParaItau,
          })
        );
      }

      // console.timeEnd("FORMA DE PAGAMENTO");// TESTANDO PERFORMANCE
      const arquivo = [];

      let lote = 0;
      let qtde_registros_arquivo = 0;
      const dataCriacao = new Date();
      const headerArquivo = createHeaderArquivo({
        ...borderoData,
        empresa_tipo_insc,
        arquivo_data_geracao: formatDate(dataCriacao, "ddMMyyyy"),
        arquivo_hora_geracao: formatDate(dataCriacao, "HHmmss"),
      });
      arquivo.push(headerArquivo);
      qtde_registros_arquivo++;

      for (const [key, formaPagamento] of formasPagamento) {
        if (!formaPagamento.length) continue;
        let qtde_registros = 0;
        let somatoria_valores = 0;
        ++lote;

        let forma_pagamento = 6;
        switch (key) {
          case "PagamentoCorrenteItau":
            forma_pagamento = 1;
            break;
          case "PagamentoPoupancaItau":
            forma_pagamento = 5;
            break;
          case "PagamentoCorrenteMesmaTitularidade":
            forma_pagamento = 6;
            break;
          case "PagamentoBoletoItau":
            forma_pagamento = 30;
            break;
          case "PagamentoBoletoOutroBancoParaItau":
            forma_pagamento = 31;
            break;
          case "PagamentoTEDOutroTitular":
            forma_pagamento = 41;
            break;
          case "PagamentoTEDMesmoTitular":
            forma_pagamento = 43;
            break;
          case "PagamentoPIX":
            forma_pagamento = 45;
            break;
          case "PagamentoPIXQRCode":
            forma_pagamento = 47;
            break;
        }

        //* Dependendo do tipo de pagamento o layout do lote muda
        if (
          key !== "PagamentoBoletoItau" &&
          key !== "PagamentoBoletoOutroBancoParaItau" &&
          key !== "PagamentoPIXQRCode"
        ) {
          const headerLote = createHeaderLote({
            ...borderoData,
            empresa_tipo_insc,
            lote,
            forma_pagamento,
          });
          arquivo.push(headerLote);
        } else {
          const headerLote = createHeaderLote({
            ...borderoData,
            lote,
            forma_pagamento,
            versao_layout: "030",
          });
          arquivo.push(headerLote);
        }

        qtde_registros++;
        qtde_registros_arquivo++;

        // formaPagamento.shift(); //! Retirar isso dps
        let registroLote = 1;
        for (const pagamento of formaPagamento) {
          const [rowVencimento] = await conn.execute(
            `
            SELECT
              tv.id as id_vencimento,  
              fb.codigo as cod_banco_favorecido,
              forn.agencia,
              forn.dv_agencia,
              forn.conta,
              forn.favorecido as favorecido_nome,
              DATE_FORMAT(tv.data_prevista, '%d/%m/%Y') as data_pagamento,
              DATE_FORMAT(tv.data_vencimento, '%d/%m/%Y') as data_vencimento,
              tv.valor as valor_pagamento,
              forn.cnpj_favorecido as favorecido_cnpj,
              t.id_tipo_chave_pix,
              t.chave_pix,
              tv.qr_code, tv.cod_barras as cod_barras_tv,
              dda.cod_barras
            FROM fin_cp_titulos t
            LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN fin_bancos fb ON fb.id = forn.id_banco
            LEFT JOIN fin_dda dda ON dda.id_vencimento = tv.id
            WHERE tv.id = ?
          `,
            [pagamento.id_vencimento]
          );
          const vencimento = rowVencimento && rowVencimento[0];

          //* Verifica se é cpf ou cnpj
          if (vencimento.favorecido_cnpj) {
            throw new Error(
              `Vencimento ${vencimento.id_vencimento}, fornecedor não tem o cnpj do favorecido ${vencimento.favorecido_nome}.`
            );
          }
          const favorecido_tipo_insc =
            vencimento.favorecido_cnpj.length === 11 ? 1 : 2;

          //* Dependendo do banco o modelo muda
          let agencia = [];
          if (vencimento.banco === 341) {
            agencia.push(
              0,
              normalizeValue(vencimento.agencia, "numeric", 4),
              " ",
              new Array(6).fill(0).join(""),
              normalizeValue(vencimento.conta, "numeric", 6),
              " ",
              normalizeValue(vencimento.dv_agencia, "numeric", 1)
            );
          } else {
            agencia.push(
              normalizeValue(vencimento.agencia, "numeric", 5),
              " ",
              normalizeValue(vencimento.conta, "numeric", 12),
              " ",
              normalizeValue(vencimento.dv_agencia, "alphanumeric", 1)
            );
          }
          //* O segmento A só é gerado se o tipo de pagamento não é boleto ou pix qr code
          if (
            key !== "PagamentoBoletoItau" &&
            key !== "PagamentoBoletoOutroBancoParaItau" &&
            key !== "PagamentoPIXQRCode"
          ) {
            const segmentoA = createSegmentoA({
              ...vencimento,
              lote,
              num_registro_lote: registroLote,
              //* Quando um pagamento é do tipo PIX Transferência o código câmara é 009
              cod_camara: key === "PagamentoPIX" && 9,
              vencimento: vencimento.id,
              agencia: agencia.join(""),
              ident_transferencia: key === "PagamentoPIX" && "04", //^^ Verificar se está correto
              cod_banco_favorecido:
                key === "PagamentoPIX"
                  ? new Array(3).fill(0).join("")
                  : vencimento.cod_banco_favorecido,
            });
            arquivo.push(segmentoA);
            qtde_registros++;
            qtde_registros_arquivo++;
          } else if (key === "PagamentoPIXQRCode") {
            //* Pagamento PIX QR Code
            const segmentoJ = createSegmentoJ({
              ...vencimento,
              lote,
              num_registro_lote: registroLote,
              valor_titulo: vencimento.valor_pagamento,
            });
            registroLote++;
            const segmentoJ52Pix = createSegmentoJ52Pix({
              ...vencimento,
              lote,
              num_registro_lote: registroLote,
              inscricao_sacado: empresa_tipo_insc,
              num_inscricao_sacado: borderoData.cnpj_empresa,
              nome_sacado: borderoData.empresa_nome,
              inscricao_cedente: favorecido_tipo_insc,
              num_inscricao_cedente: vencimento.favorecido_cnpj,
              nome_cedente: vencimento.favorecido_nome,
              chave_pagamento: normalizeURLChaveEnderecamentoPIX(
                vencimento.qr_code
              ),
            });
            arquivo.push(segmentoJ);
            arquivo.push(segmentoJ52Pix);
            qtde_registros += 2;
            qtde_registros_arquivo += 2;
          } else {
            //* Pagamento Boleto
            //todo Adicionar os valores de sacado e cedente
            const segmentoJ = createSegmentoJ({
              ...vencimento,
              lote,
              num_registro_lote: registroLote,
              valor_titulo: vencimento.valor_pagamento,
              cod_barras: vencimento.cod_barras || vencimento.cod_barras_tv,
            });
            registroLote++;
            const segmentoJ52 = createSegmentoJ52({
              ...vencimento,
              lote,
              num_registro_lote: registroLote,
              inscricao_sacado: empresa_tipo_insc,
              num_inscricao_sacado: borderoData.cnpj_empresa,
              nome_sacado: borderoData.empresa_nome,
              inscricao_cedente: favorecido_tipo_insc,
              num_inscricao_cedente: vencimento.favorecido_cnpj,
              nome_cedente: vencimento.favorecido_nome,
            });
            arquivo.push(segmentoJ);
            arquivo.push(segmentoJ52);
            qtde_registros += 2;
            qtde_registros_arquivo += 2;
          }

          somatoria_valores += parseFloat(vencimento.valor_pagamento);

          registroLote++;

          let tipo_chave = "00";
          let chave_pix = vencimento.chave_pix;
          if (key === "PagamentoPIX") {
            switch (vencimento.id_tipo_chave_pix) {
              case 1:
                // Aleatória
                tipo_chave = "04";
                break;
              case 2:
                // E-mail
                tipo_chave = "02";
                break;
              case 3:
                // Celular
                tipo_chave = "01";
                chave_pix = "+55" + normalizeNumberOnly(chave_pix);
                break;
              case 4:
                // CPF
                tipo_chave = "03";
                chave_pix = normalizeNumberOnly(chave_pix);
                break;
              case 5:
                // CNPJ
                tipo_chave = "03";
                chave_pix = normalizeNumberOnly(chave_pix);
                break;
            }

            const segmentoB = createSegmentoB({
              ...vencimento,
              lote,
              num_registro_lote: registroLote,
              tipo_chave,
              favorecido_tipo_insc,
              num_inscricao: vencimento.favorecido_cnpj,
              txid: vencimento.id,
              chave_pix,
            });
            arquivo.push(segmentoB);
            qtde_registros_arquivo++;
          }

          //* Marcando vencimento como já incluso em uma remessa
          await conn.execute(
            `
              UPDATE fin_cp_bordero_itens
              SET remessa = ?
              WHERE id_vencimento = ?
            `,
            [true, vencimento.id_vencimento]
          );
          // console.log(true, vencimento.id_vencimento);
        }
        //sdfjaslfa
        qtde_registros++;
        qtde_registros_arquivo++;
        const trailerLote = createTrailerLote({
          ...borderoData,
          lote,
          qtde_registros,
          somatoria_valores: somatoria_valores.toFixed(2).replace(".", ""),
        });

        arquivo.push(trailerLote);
      }

      qtde_registros_arquivo++;
      const trailerArquivo = createTrailerArquivo({
        qtde_lotes: lote,
        qtde_registros_arquivo,
      });
      arquivo.push(trailerArquivo);

      //* Verificação da quantidade de lotes
      if (arquivo.length < 3) {
        throw new Error(
          "Erro ao criar a remessa. O arquivo resultante está vazio"
        );
      }

      const fileBuffer = Buffer.from(arquivo.join("\r\n") + "\r\n", "utf-8");
      const filename = `REMESSA${isPix ? " PIX" : ""} - ${formatDate(
        borderoData.data_pagamento,
        "dd_MM_yyyy"
      )} - ${removeSpecialCharactersAndAccents(
        borderoData.conta_bancaria
      )}.txt`.toUpperCase();
      res.set("Content-Type", "text/plain");
      res.set("Content-Disposition", `attachment; filename=${filename}`);
      res.send(fileBuffer);
      await conn.rollback();

      // await conn.commit();
      resolve();
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "BORDERO",
        method: "EXPORT_REMESSA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
};
