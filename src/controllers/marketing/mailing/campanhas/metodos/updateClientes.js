const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const updateClienteMarketingCompras = require("./updateClienteMarketingCompras");
const updateClienteCampanha = require("./updateClienteCampanha");

module.exports = async (req, res) => {
  let conn;

  try {
    conn = await db.getConnection();
    // Filtros
    const {
      clientes
    } = req.body;

    if (!clientes || !clientes.length) {
      res.status(200).json({ message: "Success" });
      return;
    }
    for (const cliente of clientes) {
      await updateClienteMarketingCompras({ body: { ...cliente, conn_externa: conn }});
      await updateClienteCampanha({ body: { ...cliente, conn_externa: conn }});
    }
    await conn.commit();
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "MAILING",
      method: "UPDATE_CLIENTES_EM_SERIE",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    if (conn) await conn.rollback();
    res.status(500).json({ message: error.message });
  } finally {
    if (conn) conn.release();
  }
};
