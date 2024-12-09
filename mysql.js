const mysql = require("mysql2/promise");
const { logger } = require('./logger');
require("dotenv").config();

const isProduction = process.env.NODE_ENV == 'production'
const timeout = isProduction ? 1000 * 60 * 5 : 1000 * 60; // 5min em prod, 1min em dev;
const host = process.env.DB_HOST;
const database = process.env.DB_DATABASE;
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const port = process.env.DB_PORT;

const db = mysql.createPool({
  host: host,
  database: database,
  user: user,
  password: password,
  port: port,
  charset: "utf8mb4_general_ci",
  waitForConnections: true,
  connectionLimit: 150,
  queueLimit: 0,
});

async function mantainInfiniteConnection() {
  let conn;
  try {
    conn = await db.getConnection();
    await conn.execute('SELECT 1')

    if(!isProduction){
      console.log('Conexão com o banco reforçada...');
    }
  } catch (error) {
    logger.error({
      module: 'ROOT',
      origin: 'MYSQL',
      data: { name: error.name, stack: error.stack, message: error.message }
    })
  } finally {
    if (conn) conn.release();
  }
}
setInterval(mantainInfiniteConnection, timeout)

module.exports = {
  db
};