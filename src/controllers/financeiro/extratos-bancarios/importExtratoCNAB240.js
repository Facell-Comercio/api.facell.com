const { lerArquivo } = require("../../../helpers/lerArquivo");
const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");
const { remessaToObject } = require("../remessa/CNAB240/to-object");
const crypto = require("crypto");
const { formatDate } = require("date-fns");
const arquivoHeader = require("../remessa/CNAB240/layout/arquivo-header");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { conn_externa } = req.body;
    let conn;
    try {
      const { filePath, contaBancaria, user } = req.body;
      conn = conn_externa || (await db.getConnection());
      if (!conn_externa) {
        await conn.beginTransaction();
      }
      const txt = await lerArquivo(filePath);

      const obj = await remessaToObject(txt, "extrato");

      if (!parseInt(obj.arquivoHeader.banco)) {
        throw new Error("Arquivo CNAB 240 com dados incorretos!");
      }

      const header = obj.arquivoHeader;
      const [rowsContaBancaria] = await conn.execute(
        `
        SELECT cb.* FROM fin_contas_bancarias cb
        LEFT JOIN fin_bancos b ON b.id = cb.id_banco
        WHERE b.codigo = ? AND cb.conta = ?
        `,
        [header.banco, header.conta]
      );
      const contaBancariaHeader = rowsContaBancaria && rowsContaBancaria[0];

      if (!contaBancariaHeader) {
        throw new Error(`CNAB 240 Agência/Conta ${header.banco}-${header.conta} não encontrada`);
      }

      if (contaBancaria.id != contaBancariaHeader.id) {
        throw new Error(
          `CNAB 240 Agência/Conta ${contaBancariaHeader.descricao}, diverge de conta selecionada: Agência: ${contaBancaria.agencia} Conta: ${contaBancaria.conta}`
        );
      }

      for (const lote of obj.lotes) {
        for (const extrato of lote.detalhe) {
          const extrato_string = Object.values(extrato).reduce((acc, value) => {
            if (value instanceof Date) {
              value = formatDate(value, "yyyyMMdd");
            }
            return acc + (value !== null && value !== undefined ? String(value) : "");
          }, "");
          const hash = crypto.createHash("md5").update(extrato_string).digest("hex");

          const data_transaction = extrato.lancamento_data;
          const valor_transacao = parseFloat(extrato.lancamento_valor).toFixed(2);
          const descricao_transacao = extrato.lancamento_historico;
          const tipo_transacao = extrato.lancamento_tipo === "C" ? "CREDIT" : "DEBIT";
          if (data_transaction >= new Date()) {
            return;
          }
          await conn.execute(
            `INSERT INTO fin_extratos_bancarios (
              id_conta_bancaria,
              id_transacao,
              documento,
              id_user,
              data_transacao,
              valor,
              descricao,
              tipo_transacao
            ) VALUES (?,?,?,?,?,?,?,?)
            ON DUPLICATE KEY UPDATE
            valor = VALUES(valor)
          `,
            [
              contaBancaria.id,
              hash,
              hash,
              user.id,
              data_transaction,
              extrato.lancamento_tipo === "C" ? valor_transacao : valor_transacao * -1,
              descricao_transacao,
              tipo_transacao,
            ]
          );
        }
      }
      if (!conn_externa) {
        await conn.commit();
      }
      resolve();
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "EXTRATOS_BANCARIOS",
        method: "IMPORT_CNAB_240",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn && !conn_externa) conn.release();
    }
  });
};
