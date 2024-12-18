module.exports = [
  {
    field: "banco",
    startPos: 1,
    endPos: 3,
    length: 3,
    required: true,
    default: 237,
  },
  {
    field: "lote",
    startPos: 4,
    endPos: 7,
    length: 4,
    type: "numeric",
    required: true,
  },
  {
    field: "registro",
    startPos: 8,
    endPos: 8,
    length: 1,
    required: true,
    default: 3,
  },
  {
    field: "num_registro_lote",
    startPos: 9,
    endPos: 13,
    length: 5,
    required: true,
    type: "numeric",
  },
  {
    field: "cod_seg_registro_lote",
    startPos: 14,
    endPos: 14,
    length: 1,
    required: true,
    default: "J",
    type: "alphanumeric",
  },
  {
    field: "movimento_tipo",
    startPos: 15,
    endPos: 17,
    length: 3,
    required: true,
    type: "numeric",
    default: new Array(3).fill(0).join(""),
  },
  {
    field: "cod_barras",
    startPos: 18,
    endPos: 61,
    length: 44,
    required: true,
    type: "aplhanumeric",
  },
  {
    field: "favorecido_nome",
    startPos: 62,
    endPos: 91,
    length: 30,
    required: true,
    type: "alphanumeric",
  },
  {
    field: "data_vencimento",
    startPos: 92,
    endPos: 99,
    length: 8,
    required: true,
    type: "date",
  },
  {
    field: "valor_titulo",
    startPos: 100,
    endPos: 114,
    length: 15,
    required: true,
    type: "numeric",
    format: "float",
  },
  {
    field: "descontos",
    startPos: 115,
    endPos: 129,
    length: 15,
    required: false,
    type: "numeric",
    format: "float",
    default: new Array(15).fill(0).join(""),
  },
  {
    field: "acrescimos",
    startPos: 130,
    endPos: 144,
    length: 15,
    required: false,
    type: "numeric",
    format: "float",
    default: new Array(15).fill(0).join(""),
  },
  {
    field: "data_pagamento",
    startPos: 145,
    endPos: 152,
    length: 8,
    required: true,
    type: "date",
  },
  {
    field: "valor_pagamento",
    startPos: 153,
    endPos: 167,
    length: 15,
    required: true,
    type: "numeric",
    format: "float",
  },
  {
    field: "qtde_moedas",
    startPos: 168,
    endPos: 182,
    length: 15,
    required: false,
    type: "numeric",
    default: new Array(15).fill(0).join(""),
  },
  {
    field: "id_vencimento", //* num_doc
    startPos: 183,
    endPos: 202,
    length: 20,
    required: true,
    type: "alphanumeric",
  },
  {
    field: "nosso_numero",
    startPos: 203,
    endPos: 222,
    length: 20,
    required: false,
    default: new Array(20).fill(" ").join(""),
  },
  {
    field: "cod_moeda",
    startPos: 223,
    endPos: 224,
    length: 2,
    required: false,
    default: "09", //* REAL
  },
  {
    field: "brancos",
    startPos: 225,
    endPos: 230,
    length: 6,
    required: false,
    default: new Array(6).fill(" ").join(""),
  },
  {
    field: "ocorrencias",
    startPos: 231,
    endPos: 240,
    length: 10,
    required: false,
    default: new Array(10).fill(" ").join(""),
  },
];
