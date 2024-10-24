const { logger } = require("../../logger");
const { db } = require("../../mysql");

module.exports = (socket) => {
  socket.on("registerMachine", async ({ machineId, user }) => {
    try {
      await persistMachine({ machineId, user });
    } catch (error) {
      logger.error({
        module: "ROOT",
        origin: "SOCKET",
        method: "REGISTER_MACHINE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
    }
  });
};

function persistMachine({ machineId, user }) {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      conn = await db.getConnection();
      const [machines] = await conn.execute(
        "SELECT id, id_machine FROM user_maquinas WHERE id_user = ? ORDER BY id ASC",
        [user.id]
      );
      if (machines.length >= 5) {
        await conn.execute("DELETE FROM user_maquinas WHERE id = ?", [machines[0].id]);
      }
      await conn.execute("INSERT INTO user_maquinas (id_user, id_machine) VALUES (?,?)", [
        user.id,
        machineId,
      ]);
      resolve();
    } catch (error) {
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
}
