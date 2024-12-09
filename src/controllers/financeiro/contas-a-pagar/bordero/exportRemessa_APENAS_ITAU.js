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
  createSegmentoO,
} = require("../../remessa/CNAB240/to-string/itau");
const { normalizeValue } = require("../../remessa/CNAB240/to-string/masks");
const { logger } = require("../../../../../logger");

/*
^ Mesma função de antes, com a inclusão de recebimento de itens
! Vamos refatorar essa para incluir faturas!
*/
module.exports = function exportRemessa(req, res) {
  return new Promise(async (resolve, reject) => {
    const { id_bordero, isPix, itens } = req.body;

    let conn;
    try {
      conn = await db.getConnection();

      if (!id_bordero) {
        throw new Error("ID do Borderô não indicado!");
      }
      const idsVencimentos =
        itens &&
        itens.length > 0 &&
        itens.filter((item) => item.tipo == "vencimento").map((item) => item.id_vencimento);

      const idsFaturas =
        itens &&
        itens.length > 0 &&
        itens.filter((item) => item.tipo == "fatura").map((item) => item.id_vencimento);

      let whereVencimentos = ` tb.id_bordero = ? `;
      let whereFaturas = ` tb.id_bordero = ? `;

      console.log(idsVencimentos, idsFaturas);

      if (idsVencimentos && idsVencimentos.length > 0) {
        whereVencimentos += ` AND tv.id IN('${idsVencimentos
          .map((value) => db.escape(value))
          .join(",")}) `;
      }
      if (idsFaturas && idsFaturas.length > 0) {
        whereFaturas += ` AND ccf.id IN('${idsFaturas
          .map((value) => db.escape(value))
          .join(",")}) `;
      }

      await conn.beginTransaction();
      // console.log({whereVencimentos});
      // * DADOS DO BORDERÔ, CONTA BANCÁRIA, ETC:
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
        [id_bordero]
      );
      const borderoData = rowsBordero && rowsBordero[0];

      //* Verifica se é CPF ou CNPJ
      const empresa_tipo_insc = borderoData.cnpj_empresa.length === 11 ? 1 : 2;

      //* Verificação de permissão de geração de remessa~
      if (+borderoData.codigo_bancario !== 341) {
        throw new Error("A Remessa não pode ser gerada por não ser do banco Itaú");
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
        rowsPagamentoFaturaBoletoItau,
        rowsPagamentoBoletoOutroBancoParaItau,
        rowsPagamentoFaturaBoletoOutroBancoParaItau,
        rowsPagamentoPIXQRCode,
        rowsPagamentoBoletoImpostos,
        rowsPagamentoTributos,
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
        WHERE ${whereVencimentos}
        AND t.id_forma_pagamento = 5
        AND forn.cnpj <> f.cnpj
        AND fb.codigo = 341
        AND (forn.id_tipo_conta = 1 OR forn.id_tipo_conta IS NULL)
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
        AND tv.id_fatura IS NULL
      `,
            [id_bordero]
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
        WHERE ${whereVencimentos}
        AND t.id_forma_pagamento = 5
        AND forn.cnpj <> f.cnpj
        AND fb.codigo = 341
        AND forn.id_tipo_conta = 2
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
        AND tv.id_fatura IS NULL
      `,
            [id_bordero]
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
        WHERE ${whereVencimentos}
        AND t.id_forma_pagamento = 5
        AND forn.cnpj = f.cnpj
        AND fb.codigo = 341
        AND (forn.id_tipo_conta = 1 OR forn.id_tipo_conta IS NULL)
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
        AND tv.id_fatura IS NULL
      `,
            [id_bordero]
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
        WHERE ${whereVencimentos}
        AND t.id_forma_pagamento = 5
        AND forn.cnpj <> f.cnpj
        AND fb.codigo <> 341
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
        AND tv.id_fatura IS NULL
      `,
            [id_bordero]
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
        WHERE ${whereVencimentos}
        AND t.id_forma_pagamento = 5
        AND forn.cnpj = f.cnpj
        AND fb.codigo <> 341
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
        AND tv.id_fatura IS NULL
      `,
            [id_bordero]
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
        WHERE ${whereVencimentos}
        AND t.id_forma_pagamento = 4
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
        AND tv.id_fatura IS NULL
      `,
            [id_bordero]
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
        WHERE ${whereVencimentos}
        AND t.id_forma_pagamento = 1
        AND (LEFT(COALESCE(dda.cod_barras, ''), 3) = 341 OR LEFT(COALESCE(tv.cod_barras, ''), 3) = 341)
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
        AND tv.id_fatura IS NULL
      `,
            [id_bordero]
          )
          .then(([rows]) => rows),
        //* Pagamento Boleto Fatura Itaú
        conn
          .execute(
            `
        SELECT
          ccf.id as id_vencimento
        FROM fin_cartoes_corporativos_faturas ccf
        LEFT JOIN fin_cp_bordero_itens tb ON tb.id_fatura = ccf.id
        LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero
        LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
        LEFT JOIN fin_cartoes_corporativos cc ON cc.id = ccf.id_cartao
        LEFT JOIN filiais f ON f.id = cc.id_matriz
        LEFT JOIN fin_fornecedores forn ON forn.id = cc.id_fornecedor
        WHERE ${whereFaturas}
        AND LEFT(ccf.cod_barras, 3) = 341
        AND ccf.data_pagamento IS NULL
        AND (ccf.status = "erro" OR ccf.status = "pendente")
      `,
            [id_bordero]
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
        WHERE ${whereVencimentos}
        AND t.id_forma_pagamento = 1
        AND (LEFT(dda.cod_barras, 3) <> 341 OR LEFT(tv.cod_barras, 3) <> 341)
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
        AND tv.id_fatura IS NULL
      `,
            [id_bordero]
          )
          .then(([rows]) => rows),
        //* Pagamento Boleto Fatura Outro Banco Para Itaú
        conn
          .execute(
            `
        SELECT
          ccf.id as id_vencimento
        FROM fin_cartoes_corporativos_faturas ccf
        LEFT JOIN fin_cp_bordero_itens tb ON tb.id_fatura = ccf.id
        LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero
        LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
        LEFT JOIN fin_cartoes_corporativos cc ON cc.id = ccf.id_cartao
        LEFT JOIN filiais f ON f.id = cc.id_matriz
        LEFT JOIN fin_fornecedores forn ON forn.id = cc.id_fornecedor
        WHERE ${whereFaturas}
        AND LEFT(ccf.cod_barras, 3) <> 341
        AND ccf.data_pagamento IS NULL
        AND (ccf.status = "erro" OR ccf.status = "pendente")
      `,
            [id_bordero]
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
        WHERE ${whereVencimentos}
        AND t.id_forma_pagamento = 8
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
        AND tv.id_fatura IS NULL
      `,
            [id_bordero]
          )
          .then(([rows]) => rows),

        //* Pagamento Boleto de Impostos/Concessionárias
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
        WHERE ${whereVencimentos}
        AND t.id_forma_pagamento = 10
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
        AND tv.id_fatura IS NULL
  `,
            [id_bordero]
          )
          .then(([rows]) => rows),

        //* Pagamento Tributos
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
        WHERE ${whereVencimentos}
        AND t.id_forma_pagamento = 11
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
        AND tv.id_fatura IS NULL
  `,
            [id_bordero]
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
            PagamentoCorrenteMesmaTitularidade: rowsPagamentoCorrenteMesmaTitularidade,
            PagamentoTEDOutroTitular: rowsPagamentoTEDOutroTitular,
            PagamentoTEDMesmoTitular: rowsPagamentoTEDMesmoTitular,
            PagamentoBoletoItau: rowsPagamentoBoletoItau,
            PagamentoFaturaBoletoItau: rowsPagamentoFaturaBoletoItau,
            PagamentoBoletoOutroBancoParaItau: rowsPagamentoBoletoOutroBancoParaItau,
            PagamentoFaturaBoletoOutroBancoParaItau: rowsPagamentoFaturaBoletoOutroBancoParaItau,
            PagamentoBoletoImpostos: rowsPagamentoBoletoImpostos,
            PagamentoTributosCodBarras: rowsPagamentoTributos,
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
          case "PagamentoFaturaBoletoItau":
            forma_pagamento = 30;
            break;
          case "PagamentoBoletoOutroBancoParaItau":
            forma_pagamento = 31;
            break;
          case "PagamentoFaturaBoletoOutroBancoParaItau":
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
          case "PagamentoTributosCodBarras":
            forma_pagamento = 91;
            break;
          case "PagamentoBoletoImpostos":
            forma_pagamento = 13; //! Validar se essa realmente é a forma de pagamento correta
            break;
        }

        //* Dependendo do tipo de pagamento o layout do lote muda
        if (
          key !== "PagamentoBoletoItau" &&
          key !== "PagamentoBoletoOutroBancoParaItau" &&
          key !== "PagamentoPIXQRCode" &&
          key !== "PagamentoTributosCodBarras" &&
          key !== "PagamentoBoletoImpostos"
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
            tipo_pagamento: key === "PagamentoTributosCodBarras" ? "22" : "20",
            versao_layout: "030",
          });
          arquivo.push(headerLote);
        }

        qtde_registros++;
        qtde_registros_arquivo++;

        let registroLote = 1;
        for (const pagamento of formaPagamento) {
          let query = `
          SELECT
              tv.id as id_vencimento,  
              fb.codigo as cod_banco_favorecido,
              forn.agencia,
              forn.dv_agencia,
              forn.conta,
              forn.dv_conta,
              forn.favorecido as favorecido_nome,
              DATE_FORMAT(tv.data_prevista, '%d/%m/%Y') as data_pagamento,
              DATE_FORMAT(tv.data_prevista, '%d/%m/%Y') as data_vencimento,
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
          `;
          if (
            key === "PagamentoFaturaBoletoItau" ||
            key === "PagamentoFaturaBoletoOutroBancoParaItau"
          ) {
            query = `
            SELECT
              ccf.id as id_vencimento,  
              fb.codigo as cod_banco_favorecido,
              forn.agencia,
              forn.dv_agencia,
              forn.conta,
              forn.dv_conta,
              forn.favorecido as favorecido_nome,
              DATE_FORMAT(ccf.data_prevista, '%d/%m/%Y') as data_pagamento,
              DATE_FORMAT(ccf.data_prevista, '%d/%m/%Y') as data_vencimento,
              ccf.valor as valor_pagamento,
              forn.cnpj_favorecido as favorecido_cnpj,
              ccf.cod_barras as cod_barras_tv
            FROM fin_cartoes_corporativos_faturas ccf
            LEFT JOIN fin_cartoes_corporativos cc ON cc.id = ccf.id_cartao
            LEFT JOIN fin_fornecedores forn ON forn.id = cc.id_fornecedor
            LEFT JOIN fin_bancos fb ON fb.id = forn.id_banco
            WHERE ccf.id = ?
            `;
          }

          const [rowVencimento] = await conn.execute(query, [pagamento.id_vencimento]);

          const vencimento = rowVencimento && rowVencimento[0];

          const isFatura =
            key === "PagamentoFaturaBoletoItau" ||
            key === "PagamentoFaturaBoletoOutroBancoParaItau";
          // console.log(vencimento);
          //* Verifica se é cpf ou cnpj
          if (!vencimento.favorecido_cnpj) {
            throw new Error(
              `Vencimento ${vencimento.id_vencimento}, fornecedor não tem o cnpj do favorecido ${vencimento.favorecido_nome}.`
            );
          }
          const favorecido_tipo_insc = vencimento.favorecido_cnpj.length === 11 ? 1 : 2;

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
              normalizeValue(
                parseInt(vencimento.dv_conta) || parseInt(vencimento.dv_agencia),
                "numeric",
                1
              )
            );
          } else {
            agencia.push(
              normalizeValue(vencimento.agencia, "numeric", 5),
              " ",
              normalizeValue(vencimento.conta, "numeric", 12),
              " ",
              normalizeValue(
                parseInt(vencimento.dv_conta) || parseInt(vencimento.dv_agencia),
                "alphanumeric",
                1
              )
            );
          }
          //* O segmento A só é gerado se o tipo de pagamento não é boleto ou pix qr code
          if (
            key === "PagamentoPIX" ||
            key === "PagamentoTEDOutroTitular" ||
            key === "PagamentoTEDMesmoTitular" ||
            key === "PagamentoCorrenteItau" ||
            key === "PagamentoPoupancaItau" ||
            key === "PagamentoCorrenteMesmaTitularidade"
          ) {
            const segmentoA = createSegmentoA({
              ...vencimento,
              lote,
              num_registro_lote: registroLote,
              //* Quando um pagamento é do tipo PIX Transferência o código câmara é 009
              cod_camara: key === "PagamentoPIX" && 9,
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
          }

          if (key === "PagamentoBoletoImpostos" || key === "PagamentoTributosCodBarras") {
            const segmentoO = createSegmentoO({
              ...vencimento,
              lote,
              num_registro_lote: registroLote,
              cod_barras: vencimento.cod_barras || vencimento.cod_barras_tv,
              nome_concessionaria: vencimento.favorecido_nome,
            });
            arquivo.push(segmentoO);
            qtde_registros++;
            qtde_registros_arquivo++;
          }

          if (key === "PagamentoPIXQRCode") {
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
              chave_pagamento: normalizeURLChaveEnderecamentoPIX(vencimento.qr_code),
            });
            arquivo.push(segmentoJ);
            arquivo.push(segmentoJ52Pix);
            qtde_registros += 2;
            qtde_registros_arquivo += 2;
          }

          if (
            key === "PagamentoBoletoItau" ||
            key === "PagamentoBoletoOutroBancoParaItau" ||
            key === "PagamentoFaturaBoletoItau" ||
            key === "PagamentoFaturaBoletoOutroBancoParaItau"
          ) {
            //* Pagamento Boleto
            //todo Adicionar os valores de sacado e cedente
            const segmentoJ = createSegmentoJ({
              ...vencimento,
              lote,
              num_registro_lote: registroLote,
              valor_titulo: vencimento.valor_pagamento,
              cod_barras: vencimento.cod_barras || vencimento.cod_barras_tv,
              id_vencimento: isFatura ? `F${vencimento.id_vencimento}` : vencimento.id_vencimento,
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
              num_seq_registro_lote: registroLote,
              tipo_chave,
              favorecido_tipo_insc,
              num_inscricao: vencimento.favorecido_cnpj,
              txid: vencimento.id_vencimento,
              chave_pix,
            });
            arquivo.push(segmentoB);
            qtde_registros++;
            qtde_registros_arquivo++;
          }

          registroLote++;

          //* Marcando vencimento como já incluso em uma remessa
          await conn.execute(
            `
              UPDATE fin_cp_bordero_itens
              SET remessa = ?
              WHERE id_vencimento = ?
            `,
            [true, vencimento.id_vencimento]
          );
        }
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
      // if (arquivo.length < 3) {
      //   throw new Error(
      //     "Erro ao criar a remessa. O arquivo resultante está vazio"
      //   );
      // }
      // console.log(arquivo);
      const fileBuffer = Buffer.from(arquivo.join("\r\n") + "\r\n", "utf-8");
      const filename = `REMESSA${isPix ? " PIX" : ""} - ${formatDate(
        borderoData.data_pagamento,
        "dd_MM_yyyy"
      )} - ${removeSpecialCharactersAndAccents(borderoData.conta_bancaria)}.txt`.toUpperCase();
      res.set("Content-Type", "text/plain");
      res.set("Content-Disposition", `attachment; filename=${filename}`);
      res.send(fileBuffer);

      await conn.commit();
      // await conn.rollback();
      resolve();
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "BORDERO",
        method: "EXPORT_REMESSA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
