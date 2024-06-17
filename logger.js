const pino = require('pino');
const fs = require('fs');
const path = require('path');
const pretty = require('pino-pretty');

// Cria streams para salvar logs nos arquivos
const infoStream = fs.createWriteStream(path.join(__dirname, 'logs', 'info.log'),{ flags: 'a', encoding: 'utf8' });
const errorStream = fs.createWriteStream(path.join(__dirname, 'logs', 'error.log'),{ flags: 'a', encoding: 'utf8' });
const warnStream = fs.createWriteStream(path.join(__dirname, 'logs', 'warn.log'),{ flags: 'a', encoding: 'utf8' });
const prettyStream = pretty(); // Para logar no terminal com formato bonito

// Configura os streams no pino
const streams = [
  { level: 'info', stream: infoStream }, // Stream para logs de info
  { level: 'warn', stream: warnStream }, // Stream para logs de alertas
  { level: 'error', stream: errorStream }, // Stream para logs de erro
  { stream: prettyStream }, // Stream para logs no terminal
];

// Cria o logger com os streams configurados
const logger = pino({}, pino.multistream(streams));

module.exports = logger;