const mysql = require("mysql2/promise");
require("dotenv").config();

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
  connectionLimit: 300,
  idleTimeout: 60000,
});

module.exports = {
    db
};