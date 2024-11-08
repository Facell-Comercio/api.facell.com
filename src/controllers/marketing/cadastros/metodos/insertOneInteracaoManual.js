const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");
const crypto = require("crypto");
const { objectToStringLine } = require("../../../../helpers/mask");
const { formatDate } = require("date-fns");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { id, gsm, cpf, nome_assinante, data, operador, observacao } = req.body;
    conn = conn_externa || (await db.getConnection());

    if (id) {
      throw new Error(
        "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
      );
    }
    if (!gsm) {
      throw new Error("GSM não informado");
    }
    if (!cpf) {
      throw new Error("CPF não informado");
    }
    if (!nome_assinante) {
      throw new Error("Nome do cliente não informado");
    }
    if (!data) {
      throw new Error("Data não informada");
    }
    if (!operador) {
      throw new Error("Operador não informado");
    }
    if (!operador) {
      throw new Error("Observação não informada");
    }

    const idHash = crypto
      .createHash("md5")
      .update(
        objectToStringLine({
          plataforma: "manual",
          gsm,
          cpf,
          nome_assinante,
          status: "CONTATO REALIZADO",
          data,
          operador,
          observacao,
        })
      )
      .digest("hex");

    await conn.execute(
      `INSERT INTO marketing_mailing_interacoes (
        id,
        plataforma,
        gsm,
        cpf,
        nome_assinante,
        status,
        data,
        operador,
        observacao
      )VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        idHash,
        "manual",
        gsm,
        cpf,
        nome_assinante,
        "CONTATO REALIZADO",
        formatDate(data, "yyyy-MM-dd"),
        operador,
        observacao,
      ]
    );
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "CADASTROS",
      method: "INSERT_ONE_INTERAÇÃO",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    if (String(error.message).includes("Duplicate entry")) {
      res.status(500).json({ message: "Interação já cadastrada!" });
    } else {
      res.status(500).json({ message: error.message });
    }
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
