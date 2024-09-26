const { db } = require("../../mysql");

require("dotenv");

function registerUserMachine(req) {
  return new Promise(async (resolve, reject) => {
    const { subscription, user } = req.body;
    const { endpoint, keys } = subscription || {};
    const { p256dh, auth } = keys || {};
    let conn;
    try {
      if (!endpoint || !p256dh || !auth) {
        throw new Error("Dados da inscrição incorretos");
      }
      conn = await db.getConnection();
      const [machines] = await conn.execute(
        "SELECT id FROM user_maquinas WHERE id_user = ? ORDER BY id ASC",
        [user.id]
      );
      if (machines.length >= 5) {
        await conn.execute("DELETE FROM user_maquinas WHERE id = ?", [machines[0].id]);
      }
      await conn.execute(
        "INSERT INTO user_maquinas (id_user, endpoint, public_key, auth) VALUES (?,?,?,?)",
        [user.id, endpoint, p256dh, auth]
      );
      resolve();
    } catch (error) {
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
}

module.exports = {
  registerUserMachine,
};
