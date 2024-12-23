const { startOfDay } = require("date-fns");
const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");
const { enviarEmail } = require("../../../helpers/email");
const { normalizeCurrency } = require("../../../helpers/mask");
require("dotenv").config();
const url = process.env.PUBLIC_URL;

module.exports = function update(req) {
  return new Promise(async (resolve, reject) => {
    const { id_abonador, abonador, email_abonador, id_vales_list, motivo } = req.body;
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    let conn;
    try {
      if (!id_abonador) {
        throw new Error("ID abonador não informado!");
      }
      if (!id_vales_list.length) {
        throw new Error("Lista de ID vales não informada!");
      }
      if (!email_abonador) {
        throw new Error("Email do abonador não informado!");
      }
      if (!motivo) {
        throw new Error("Motivo do abono não informado!");
      }
      conn = await db.getConnection();
      await conn.beginTransaction();

      const [vales] = await conn.execute(`
        SELECT v.id, v.saldo, v.nome_colaborador as nome, f.nome as filial FROM vales v
        LEFT JOIN filiais f ON f.id = v.id_filial
        WHERE v.id IN (${id_vales_list.map((id) => db.escape(id)).join(",")}) AND v.abonado = 0`);

      await conn.execute(
        `UPDATE vales SET
          abonado = 1,
          id_abonador = ?
        WHERE id IN (${vales.map((vale) => db.escape(vale.id)).join(",")})`,
        [id_abonador]
      );

      const obs = `ABONO - MOTIVO: ${motivo} POR: ${abonador}`.toUpperCase();

      const arrayVales = vales.map((v) => `(${v.id}, ${v.saldo}, ${db.escape(obs)}, ${user.id})`);

      await conn.execute(`
        INSERT INTO vales_abatimentos (id_vale, valor, obs, id_user)
        VALUES ${arrayVales.join(",")}
        `);

      const totalVales = vales.reduce((acc, vale) => acc + parseFloat(vale.saldo), 0);
      await enviarEmail({
        destinatarios: [email_abonador],
        assunto: `ABONO DE VALES - QTDE ${vales.length} - VALOR: ${normalizeCurrency(totalVales)}`,
        corpo_html: `
        <p>Olá, ${abonador.toUpperCase()}</p>
        <p>Foi registrado no sistema interno de vales um abono de vales em lote por ${
          user.nome
        }, onde você foi o autorizador;</p>
        <p>Motivo do abono: ${motivo.toUpperCase()};</p>
        <p><strong>Lista de vales abonados:</strong></p>
        <ul>
        ${vales
          .map(
            (v) =>
              `<li><a href="${url}/comercial/vales?id=${v.id}">#${v.id}</a> - ${v.filial} - ${
                v.nome
              } - ${normalizeCurrency(v.saldo)}</li>`
          )
          .join("\n")}
        </ul>
        Valor total: ${normalizeCurrency(totalVales)}`,
      });

      // await conn.rollback();
      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "VALES",
        method: "ABONO_VALES_LOTE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
