// OK
module.exports = [
  {
    field: "tipo_registro",
    startPos: 1,
    endPos: 1,
    length: 1,
    required: true,
    type: "numeric",
    default: 1,
  },
  {
    field: "cod_inscricao",
    startPos: 2,
    endPos: 3,
    length: 2,
    required: true,
    type: "numeric",
    default: "02",
  },
  {
    field: "num_inscricao", //* CNPJ
    startPos: 4,
    endPos: 17,
    length: 14,
    required: true,
    type: "numeric",
  },
  {
    field: "agencia",
    startPos: 18,
    endPos: 21,
    length: 4,
    required: true,
    type: "numeric",
  },
  {
    field: "zeros",
    startPos: 22,
    endPos: 23,
    length: 2,
    type: "alphanumeric",
    default: new Array(2).fill(0).join(""),
  },
  {
    field: "conta",
    startPos: 24,
    endPos: 28,
    length: 5,
    required: true,
    type: "numeric",
  },
  {
    field: "dac",
    startPos: 29,
    endPos: 29,
    length: 1,
    required: false,
    type: "numeric",
    default: 0,
  },
  {
    field: "brancos",
    startPos: 30,
    endPos: 37,
    length: 8,
    type: "alphanumeric",
    default: new Array(4).fill(" ").join(""),
  },
  {
    field: "uso_empresa", //* ID Boleto
    startPos: 38,
    endPos: 62,
    length: 25,
    required: false,
    type: "alphanumeric",
    default: new Array(25).fill(" ").join(""),
  },
  {
    field: "nosso_numero", //* ID Boleto (REPETE)
    startPos: 63,
    endPos: 70,
    length: 8,
    required: true,
    type: "numeric",
  },
  {
    field: "brancos",
    startPos: 71,
    endPos: 82,
    length: 12,
    type: "alphanumeric",
    default: new Array(13).fill(" ").join(""),
  },
  {
    field: "num_carteira",
    startPos: 83,
    endPos: 85,
    length: 3,
    required: true,
    type: "numeric",
    default: 109,
  },
  {
    field: "nosso_numero_confirmado",
    startPos: 86,
    endPos: 93,
    length: 8,
    required: false,
    type: "alphanumeric",
    default: new Array(3).fill(0).join(""),
  },
  {
    field: "dac_nosso_numero",
    startPos: 94,
    endPos: 94,
    length: 1,
    required: false,
    type: "alphanumeric",
    default: new Array(3).fill(" ").join(""),
  },
  {
    field: "brancos",
    startPos: 95,
    endPos: 107,
    length: 13,
    required: false,
    type: "alphanumeric",
    default: new Array(13).fill(" ").join(""),
  },
  {
    field: "cod_carteira",
    startPos: 108,
    endPos: 108,
    length: 1,
    required: true,
    type: "alphanumeric",
    default: "I",
  },
  {
    field: "cod_ocorrencia",
    startPos: 109,
    endPos: 110,
    length: 2,
    type: "numeric",
    required: true,
    default: "01",
  },
  {
    field: "data_ocorrencia",
    startPos: 111,
    endPos: 116,
    length: 6,
    required: true,
    type: "date",
    default: new Array(6).fill(0).join(""),
  },
  {
    field: "num_doc",
    startPos: 117,
    endPos: 126,
    length: 10,
    required: true,
    type: "alphanumeric",
    default: new Array(20).fill(0).join(""),
  },
  {
    field: "nosso_numero_2",
    startPos: 127,
    endPos: 134,
    length: 8,
    required: false,
    type: "alphanumeric",
    default: new Array(8).fill(0).join(""),
  },
  {
    field: "brancos",
    startPos: 135,
    endPos: 146,
    length: 12,
    required: true,
    type: "alphanumeric",
    default: new Array(12).fill(" ").join(""),
  },
  {
    field: "data_vencimento",
    startPos: 147,
    endPos: 152,
    length: 6,
    required: true,
    type: "date",
    default: new Array(6).fill(0).join(""),
  },
  {
    field: "valor_titulo",
    startPos: 153,
    endPos: 165,
    length: 13,
    required: true,
    type: "numeric",
    format: "float",
  },
  {
    field: "banco",
    startPos: 166,
    endPos: 168,
    length: 3,
    required: true,
    type: "numeric",
    default: 341,
  },
  {
    field: "agencia",
    startPos: 169,
    endPos: 172,
    length: 4,
    required: true,
    type: "numeric",
  },
  {
    field: "dac_agencia_cobradora",
    startPos: 173,
    endPos: 173,
    length: 1,
    required: true,
    type: "numeric",
  },
  {
    field: "especie",
    startPos: 174,
    endPos: 175,
    length: 2,
    required: true,
    type: "alphanumeric",
    default: "01",
  },
  {
    field: "tarifa_cobranca",
    startPos: 176,
    endPos: 188,
    length: 13,
    required: true,
    type: "numeric",
    format: "float",
    default: new Array(13).fill(0).join(""),
  },
  {
    field: "brancos",
    startPos: 189,
    endPos: 214,
    length: 26,
    required: true,
    type: "alphanumeric",
    default: new Array(26).fill(" ").join(""),
  },
  {
    field: "valor_iof",
    startPos: 215,
    endPos: 227,
    length: 13,
    required: false,
    type: "numeric",
    format: "float",
    default: new Array(13).fill(0).join(""),
  },
  {
    field: "valor_abatimento",
    startPos: 228,
    endPos: 240,
    length: 13,
    required: false,
    type: "numeric",
    format: "float",
    default: new Array(13).fill(0).join(""),
  },
  {
    field: "descontos",
    startPos: 241,
    endPos: 253,
    length: 13,
    required: false,
    type: "numeric",
    format: "float",
    default: new Array(13).fill(0).join(""),
  },
  {
    field: "valor_principal",
    startPos: 254,
    endPos: 266,
    length: 13,
    required: false,
    type: "numeric",
    format: "float",
    default: new Array(13).fill(0).join(""),
  },
  {
    field: "juros_mora",
    startPos: 267,
    endPos: 279,
    length: 13,
    required: true,
    type: "numeric",
    format: "float",
    default: new Array(13).fill(0).join(""),
  },
  {
    field: "outros_creditos",
    startPos: 280,
    endPos: 292,
    length: 13,
    required: true,
    type: "numeric",
    format: "float",
    default: new Array(13).fill(0).join(""),
  },
  {
    field: "boleto_dda",
    startPos: 293,
    endPos: 293,
    length: 1,
    required: true,
    type: "alphanumeric",
  },
  {
    field: "brancos",
    startPos: 294,
    endPos: 295,
    length: 2,
    required: true,
    type: "alphanumeric",
    default: new Array(2).fill(" ").join(""),
  },
  {
    field: "data_credito",
    startPos: 296,
    endPos: 301,
    length: 6,
    required: true,
    type: "date",
    default: new Array(6).fill(0).join(""),
  },
  {
    field: "instr_cancelada",
    startPos: 302,
    endPos: 305,
    length: 4,
    required: true,
    type: "numeric",
    default: new Array(4).fill(0).join(""),
  },
  {
    field: "brancos",
    startPos: 306,
    endPos: 311,
    length: 6,
    required: true,
    type: "alphanumeric",
    default: new Array(6).fill(" ").join(""),
  },
  {
    field: "zeros",
    startPos: 312,
    endPos: 324,
    length: 13,
    required: true,
    type: "alphanumeric",
    default: new Array(13).fill(0).join(""),
  },
  {
    field: "nome_pagador",
    startPos: 325,
    endPos: 354,
    length: 30,
    required: true,
    type: "alphanumeric",
  },
  {
    field: "brancos",
    startPos: 355,
    endPos: 377,
    length: 23,
    required: true,
    type: "alphanumeric",
    default: new Array(23).fill(" ").join(""),
  },
  {
    field: "erros",
    startPos: 378,
    endPos: 385,
    length: 8,
    required: false,
    type: "alphanumeric",
    default: new Array(8).fill(" ").join(""),
  },
  {
    field: "brancos",
    startPos: 386,
    endPos: 392,
    length: 7,
    required: false,
    type: "alphanumeric",
    default: new Array(7).fill(" ").join(""),
  },
  {
    field: "cod_liquidacao",
    startPos: 393,
    endPos: 394,
    length: 2,
    required: false,
    type: "alphanumeric",
    default: " ",
  },
  {
    field: "num_sequencial",
    startPos: 395,
    endPos: 400,
    length: 6,
    required: true,
    type: "numeric",
  },
];