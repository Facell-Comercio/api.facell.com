// OK
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
    required: true,
    default: "0000",
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
    field: "num_seq_registro_lote",
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
    default: "E",
    type: "alphanumeric",
  },
  {
    field: "brancos",
    startPos: 15,
    endPos: 17,
    length: 3,
    type: "alphanumeric",
    default: new Array(3).fill(" ").join(""),
  },
  {
    field: "empresa_tipo_insc",
    startPos: 18,
    endPos: 18,
    length: 1,
    required: true,
    type: "alphanumeric",
    default: "2",
  },
  {
    field: "cnpj_empresa",
    startPos: 19,
    endPos: 32,
    length: 14,
    required: true,
    type: "numeric",
  },
  {
    field: "cod_convenio",
    startPos: 33,
    endPos: 52,
    length: 20,
    type: "alphanumeric",
    default: new Array(20).fill(" ").join(""),
  },
  {
    field: "agencia",
    startPos: 53,
    endPos: 57,
    length: 5,
    required: true,
    type: "numeric",
    default: new Array(5).fill(0).join(""),
  },
  {
    field: "dv_agencia",
    startPos: 58,
    endPos: 58,
    length: 1,
    type: "alphanumeric",
    default: " ",
  },
  {
    field: "conta",
    startPos: 59,
    endPos: 70,
    length: 12,
    type: "numeric",
    required: true,
  },
  {
    field: "dv_conta",
    startPos: 71,
    endPos: 71,
    length: 1,
    type: "alphanumeric",
    default: " ",
  },
  {
    field: "dv_agconta",
    startPos: 72,
    endPos: 72,
    length: 1,
    type: "alphanumeric",
    default: " ",
  },
  {
    field: "nome_empresa",
    startPos: 73,
    endPos: 102,
    length: 30,
    type: "alphanumeric",
    default: new Array(30).fill(" ").join(""),
  },
  {
    field: "brancos",
    startPos: 103,
    endPos: 108,
    length: 6,
    required: false,
    type: "alphanumeric",
    default: new Array(6).fill(" ").join(""),
  },
  {
    field: "natureza",
    startPos: 109,
    endPos: 111,
    length: 3,
    required: true,
    type: "alphanumeric",
  },
  {
    field: "tipo_complemento_lancamento",
    startPos: 112,
    endPos: 113,
    length: 2,
    required: true,
    type: "numeric",
  },
  {
    field: "complemento_lancamento",
    startPos: 114,
    endPos: 133,
    length: 20,
    required: true,
    type: "alphanumeric",
  },
  {
    field: "cpmf",
    startPos: 134,
    endPos: 134,
    length: 1,
    required: true,
    type: "alphanumeric",
  },
  {
    field: "data_contabil",
    startPos: 135,
    endPos: 142,
    length: 8,
    required: true,
    type: "date",
  },
  {
    field: "lancamento_data",
    startPos: 143,
    endPos: 150,
    length: 8,
    required: true,
    type: "date",
  },
  {
    field: "lancamento_valor",
    startPos: 151,
    endPos: 168,
    length: 18,
    required: true,
    type: "numeric",
    format: "float",
  },
  {
    field: "lancamento_tipo",
    startPos: 169,
    endPos: 169,
    length: 1,
    required: true,
    type: "alphanumeric",
  },
  {
    field: "lancamento_categoria",
    startPos: 170,
    endPos: 172,
    length: 1,
    required: true,
    type: "numeric",
  },
  {
    field: "lancamento_codigo_historico",
    startPos: 173,
    endPos: 176,
    length: 4,
    required: true,
    type: "alphanumeric",
  },
  {
    field: "lancamento_historico",
    startPos: 177,
    endPos: 201,
    length: 25,
    required: true,
    type: "alphanumeric",
  },
  {
    field: "num_doc",
    startPos: 202,
    endPos: 240,
    length: 39,
    required: false,
    type: "alphanumeric",
  },
];
