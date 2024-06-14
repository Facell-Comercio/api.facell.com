const pino = require('pino');
const fs = require('fs');
const path = require('path');
const pretty = require('pino-pretty');

// Cria o stream para salvar logs no arquivo
var streams = [
  {stream: fs.createWriteStream('/tmp/info.stream.out')},
  {stream: pretty() },
  {level: 'debug', stream: fs.createWriteStream('/tmp/debug.stream.out')},
  {level: 'fatal', stream: fs.createWriteStream('/tmp/fatal.stream.out')}
]

// Função para criar um logger personalizado para um departamento
  const logger = pino({
    level: 'info',
  }, streams);


module.exports = logger;