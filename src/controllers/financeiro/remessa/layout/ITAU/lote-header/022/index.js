module.exports = [
  {
    field: "banco",
    startPos: 1,
    endPos: 3,
    length: 3,
    required: true,
    default: 341,
  },
  {
    field: "lote",
    startPos: 4,
    endPos: 7,
    length: 4,
    required: true,
    type: "numeric",
    default: "0001",
  },
  {
    field: "registro",
    startPos: 8,
    endPos: 8,
    length: 1,
    required: true,
    default: 1,
  },
  {
    field: "operacao",
    startPos: 9,
    endPos: 9,
    length: 1,
    default: "I",
    type: "alphanumeric",
  },
  {
    field: "tipo_pagamento",
    startPos: 10,
    endPos: 11,
    length: 2,
    type: "numeric",
    default: "03",
  },
  {
    field: "zeros",
    startPos: 12,
    endPos: 13,
    length: 2,
    type: "alphanumeric",
    default: "  ",
  },
  {
    field: "versao_layout",
    startPos: 14,
    endPos: 16,
    length: 3,
    required: true,
    default: "022",
  },
  {
    field: "brancos",
    startPos: 17,
    endPos: 17,
    length: 1,
    default: " ",
  },
  {
    field: "empresa_tipo_insc",
    startPos: 18,
    endPos: 18,
    length: 1,
    required: true,
    type: "numeric",
    default: "2",
  },
  {
    field: "cnpj_empresa",
    startPos: 19,
    endPos: 33,
    length: 15,
    required: true,
    type: "numeric",
  },
  {
    field: "cod_convenio",
    startPos: 34,
    endPos: 53,
    length: 20,
    required: true,
    type: "alphanumeric",
    default: new Array(20).fill(" ").join(""),
  },
  {
    field: "agencia",
    startPos: 54,
    endPos: 58,
    length: 5,
    required: true,
    type: "numeric",
    default: new Array(5).fill(0).join(""),
  },
  {
    field: "dv_agencia",
    startPos: 59,
    endPos: 59,
    length: 1,
    type: "alphanumeric",
    default: ' '
  },
  {
    field: "conta",
    startPos: 60,
    endPos: 71,
    length: 12,
    type: "numeric",
    required: true,
  },
  {
    field: "dv_conta",
    startPos: 72,
    endPos: 72,
    length: 1,
    type: "alphanumeric",
    default: ' '
  },
  {
    field: "dv_agconta",
    startPos: 73,
    endPos: 73,
    length: 1,
    type: "alphanumeric",
    default: ' '
  },
  {
    field: "nome_empresa",
    startPos: 74,
    endPos: 103,
    length: 30,
    type: "alphanumeric",
    default: new Array(30).fill(' ').join('')
  },
  {
    field: "brancos",
    startPos: 104,
    endPos: 240,
    length: 137,
    default: new Array(137).fill(' ').join(''),
  },
];