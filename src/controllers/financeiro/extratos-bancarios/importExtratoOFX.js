const { formatDate } = require("date-fns");
const { lerOFX, formatarDataTransacao } = require("../../../helpers/lerOfx");
const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");

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
      const ofxParsed = await lerOFX(filePath);

      if (!ofxParsed.OFX.BANKMSGSRSV1.STMTTRNRS) {
        throw new Error("Arquivo OFX com dados incorretos!");
      }

      const ofx_conta = ofxParsed.OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKACCTFROM;

      const ofx_correto = ofx_conta.ACCTID.includes(contaBancaria.conta);
      if (!ofx_correto) {
        throw new Error(
          `OFX Agência/Conta ${ofx_conta.ACCTID}, diverge de conta selecionada: Agência: ${contaBancaria.agencia} Conta: ${contaBancaria.conta}`
        );
      }
      const data_atual = formatDate(new Date(), "yyyy-MM-dd");

      // Função de importaçaõ de transação:
      async function importTransacao({ transaction }) {
        const data_transaction = formatarDataTransacao(transaction.DTPOSTED);
        const id_transacao = transaction.FITID;
        const valor_transacao = parseFloat(transaction.TRNAMT.replace(",", ".")).toFixed(2);
        const documento_transacao = transaction.CHECKNUM || transaction.FITID;
        const descricao_transacao = transaction.MEMO;
        const tipo_transacao = transaction.TRNTYPE.toUpperCase();

        if (data_transaction >= data_atual) {
          return;
        }

        await conn.execute(
          `INSERT INTO fin_extratos_bancarios (
          id_conta_bancaria, 
          id_transacao,
          id_user,
          data_transacao, 
          valor,
          documento,
          descricao,
          tipo_transacao
        ) VALUES (?,?,?,?,?,?,?,?) 
          ON DUPLICATE KEY UPDATE
          valor = VALUES(valor)
        `,
          [
            contaBancaria.id,
            id_transacao,
            user.id,
            data_transaction,
            valor_transacao,
            documento_transacao,
            descricao_transacao,
            tipo_transacao,
          ]
        );
      }

      const ofx_transactions = ofxParsed.OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKTRANLIST.STMTTRN;
      if (ofx_transactions) {
        if (Array.isArray(ofx_transactions)) {
          for (const transaction of ofx_transactions) {
            await importTransacao({ transaction });
          }
        } else {
          await importTransacao({ transaction: ofx_transactions });
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
        method: "IMPORT_OFX",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn && !conn_externa) conn.release();
    }
  });
};
