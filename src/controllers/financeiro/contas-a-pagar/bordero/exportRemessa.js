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
} = require("../../remessa/CNAB240/to-string");
const { normalizeValue } = require("../../remessa/CNAB240/to-string/masks");
const { logger } = require("../../../../../logger");
const remessaItau = require("./remessa/remessaItau");
const remessaBradesco = require("./remessa/remessaBradesco");

/*
 * Inclusão de recebimento de itens
 * Refatorado para incluir faturas
 * Adaptado para ser multibancos
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

      if (idsVencimentos && idsVencimentos.length > 0) {
        whereVencimentos += ` AND tv.id IN(${idsVencimentos
          .map((value) => db.escape(value))
          .join(",")}) `;
      }
      if (idsFaturas && idsFaturas.length > 0) {
        whereFaturas += ` AND ccf.id IN(${idsFaturas.map((value) => db.escape(value)).join(",")}) `;
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
          cb.descricao as conta_bancaria, b.data_pagamento,
          UPPER(RPAD(fb.nome, 30, ' ')) as nome_banco,
          LPAD(fb.codigo, 3, '0') as codigo_banco
        FROM fin_cp_bordero b
        LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
        LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
        LEFT JOIN filiais f ON f.id = cb.id_filial
        WHERE b.id = ?
      `,
        [id_bordero]
      );
      const borderoData = rowsBordero && rowsBordero[0];
      if (!borderoData) {
        throw new Error("Bordero não localizado!");
      }

      // const nome_banco = borderoData["nome_banco"];
      const codigo_banco = +borderoData["codigo_banco"];

      //* Verificação de permissão de geração de remessa~
      if (![341, 237].includes(codigo_banco)) {
        throw new Error("A Remessa não pode ser gerada por ser de um banco não mapeado");
      }

      //* Verifica se é CPF ou CNPJ
      const empresa_tipo_insc = borderoData.cnpj_empresa.length === 11 ? 1 : 2;

      //* Consulta das formas de pagamento *//
      // console.time("FORMA DE PAGAMENTO"); // TESTANDO PERFORMANCE
      const [
        rowsPagamentoCorrente,
        rowsPagamentoPoupanca,
        rowsPagamentoCorrenteMesmaTitularidade,
        rowsPagamentoTEDOutroTitular,
        rowsPagamentoTEDMesmoTitular,
        rowsPagamentoPIX,
        rowsPagamentoBoleto,
        rowsPagamentoFaturaBoleto,
        rowsPagamentoBoletoOutroBanco,
        rowsPagamentoFaturaBoletoOutroBanco,
        rowsPagamentoPIXQRCode,
        rowsPagamentoBoletoImpostos,
        rowsPagamentoTributos,
      ] = await Promise.all([
        //* Pagamento Corrente Itaú
        conn
          .execute(
            `
        SELECT DISTINCT
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
        AND fb.codigo = ?
        AND (forn.id_tipo_conta = 1 OR forn.id_tipo_conta IS NULL)
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
        AND tv.id_fatura IS NULL
      `,
            [id_bordero, codigo_banco]
          )
          .then(([rows]) => rows),

        //* Pagamento Poupança Itaú
        conn
          .execute(
            `
        SELECT DISTINCT
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
        AND fb.codigo = ?
        AND forn.id_tipo_conta = 2
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
        AND tv.id_fatura IS NULL
      `,
            [id_bordero, codigo_banco]
          )
          .then(([rows]) => rows),

        //* Pagamento Corrente Mesma Titularidade
        conn
          .execute(
            `
        SELECT DISTINCT
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
        AND fb.codigo = ?
        AND (forn.id_tipo_conta = 1 OR forn.id_tipo_conta IS NULL)
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
        AND tv.id_fatura IS NULL
      `,
            [id_bordero, codigo_banco]
          )
          .then(([rows]) => rows),

        //* Pagamento TED Outro Titular
        conn
          .execute(
            `
        SELECT DISTINCT
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
        AND fb.codigo <> ?
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
        AND tv.id_fatura IS NULL
      `,
            [id_bordero, codigo_banco]
          )
          .then(([rows]) => rows),

        //* Pagamento TED Mesmo Titular
        conn
          .execute(
            `
        SELECT DISTINCT
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
        AND fb.codigo <> ?
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
        AND tv.id_fatura IS NULL
      `,
            [id_bordero, codigo_banco]
          )
          .then(([rows]) => rows),

        //* Pagamento PIX
        conn
          .execute(
            `
        SELECT DISTINCT
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

        //* Pagamento Boleto Mesmo Banco
        conn
          .execute(
            `
        SELECT DISTINCT
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
        AND COALESCE(dda.cod_barras, tv.cod_barras) IS NOT NULL
        AND LEFT(COALESCE(COALESCE(dda.cod_barras, tv.cod_barras), '000'), 3) = ?
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
        AND tv.id_fatura IS NULL
      `,
            [id_bordero, codigo_banco]
          )
          .then(([rows]) => rows),
        //* Pagamento Boleto Fatura Mesmo Banco
        conn
          .execute(
            `
        SELECT DISTINCT
          ccf.id as id_vencimento
        FROM fin_cartoes_corporativos_faturas ccf
        LEFT JOIN fin_cp_bordero_itens tb ON tb.id_fatura = ccf.id
        LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero
        LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
        LEFT JOIN fin_cartoes_corporativos cc ON cc.id = ccf.id_cartao
        LEFT JOIN filiais f ON f.id = cc.id_matriz
        LEFT JOIN fin_fornecedores forn ON forn.id = cc.id_fornecedor
        LEFT JOIN fin_dda dda ON dda.id_fatura = ccf.id
        WHERE ${whereFaturas}
        AND COALESCE(dda.cod_barras, ccf.cod_barras) IS NOT NULL
        AND LEFT(COALESCE(COALESCE(dda.cod_barras, ccf.cod_barras), '000'), 3) = ?
        AND ccf.data_pagamento IS NULL
        AND (ccf.status = "erro" OR ccf.status = "pendente")
      `,
            [id_bordero, codigo_banco]
          )
          .then(([rows]) => rows),
        //* Pagamento Boleto Outros Bancos
        conn
          .execute(
            `
        SELECT DISTINCT
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
        AND COALESCE(dda.cod_barras, tv.cod_barras) IS NOT NULL
        AND LEFT(COALESCE(COALESCE(dda.cod_barras, tv.cod_barras), '000'), 3) <> ?
        AND tv.data_pagamento IS NULL
        AND (tv.status = "erro" OR tv.status = "pendente")
        AND tv.id_fatura IS NULL
      `,
            [id_bordero, codigo_banco]
          )
          .then(([rows]) => rows),
        //* Pagamento Boleto Fatura Outros Bancos
        conn
          .execute(
            `
        SELECT DISTINCT
          ccf.id as id_vencimento
        FROM fin_cartoes_corporativos_faturas ccf
        LEFT JOIN fin_cp_bordero_itens tb ON tb.id_fatura = ccf.id
        LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero
        LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
        LEFT JOIN fin_cartoes_corporativos cc ON cc.id = ccf.id_cartao
        LEFT JOIN filiais f ON f.id = cc.id_matriz
        LEFT JOIN fin_fornecedores forn ON forn.id = cc.id_fornecedor
        LEFT JOIN fin_dda dda ON dda.id_fatura = ccf.id
        WHERE ${whereFaturas}
        AND COALESCE(dda.cod_barras, ccf.cod_barras) IS NOT NULL
        AND LEFT(COALESCE(dda.cod_barras, ccf.cod_barras), 3) <> ?
        AND ccf.data_pagamento IS NULL
        AND (ccf.status = "erro" OR ccf.status = "pendente")
      `,
            [id_bordero, codigo_banco]
          )
          .then(([rows]) => rows),
        //* Pagamento PIX QR Code
        conn
          .execute(
            `
        SELECT DISTINCT
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
        SELECT DISTINCT
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
        SELECT DISTINCT
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
            PagamentoCorrente: rowsPagamentoCorrente,
            PagamentoPoupanca: rowsPagamentoPoupanca,
            PagamentoCorrenteMesmaTitularidade: rowsPagamentoCorrenteMesmaTitularidade,
            PagamentoTEDOutroTitular: rowsPagamentoTEDOutroTitular,
            PagamentoTEDMesmoTitular: rowsPagamentoTEDMesmoTitular,
            PagamentoBoleto: rowsPagamentoBoleto,
            PagamentoFaturaBoleto: rowsPagamentoFaturaBoleto,
            PagamentoBoletoOutroBanco: rowsPagamentoBoletoOutroBanco,
            PagamentoFaturaBoletoOutroBanco: rowsPagamentoFaturaBoletoOutroBanco,
            PagamentoBoletoImpostos: rowsPagamentoBoletoImpostos,
            PagamentoTributosCodBarras: rowsPagamentoTributos,
          })
        );
      }

      let arquivo;
      if (codigo_banco == 341) {
        arquivo = await remessaItau({
          formasPagamento,
          empresa_tipo_insc,
          borderoData,
          isPix,
          conn_externa: conn,
        });
      }
      if (codigo_banco == 237) {
        arquivo = await remessaBradesco({
          formasPagamento,
          empresa_tipo_insc,
          borderoData,
          isPix,
          conn_externa: conn,
        });
      }

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
