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
    type: "numeric",
    default: "0000",
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
    required: true,
    default: "C",
    type: "alphanumeric",
  },
  {
    field: "tipo_pagamento",
    startPos: 10,
    endPos: 11,
    length: 2,
    required: true,
    type: "numeric",
    default: "20", //? VERIFICAR SE ESTÁ CORRETO
  },
  {
    field: "forma_pagamento",
    startPos: 12,
    endPos: 13,
    length: 2,
    required: true,
    type: "numeric",
    default: "03", //? VER QUAL O CORRETO
  },
  {
    field: "versao_layout",
    startPos: 14,
    endPos: 16,
    length: 3,
    required: true,
    default: "012",
  },
  {
    field: "brancos",
    startPos: 17,
    endPos: 17,
    length: 1,
    required: false,
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
    endPos: 32,
    length: 14,
    required: true,
    type: "numeric",
  },
  {
    field: "convenio",
    startPos: 33,
    endPos: 52,
    length: 20,
    required: true,
    default: 543568,
  },
  {
    field: "agencia",
    startPos: 53,
    endPos: 57,
    length: 5,
    required: true,
    type: "numeric",
  },
  {
    field: "dv_agencia",
    startPos: 58,
    endPos: 58,
    length: 1,
    required: false,
    default: " ",
  },
  {
    field: "conta",
    startPos: 59,
    endPos: 70,
    length: 12,
    required: true,
    type: "numeric",
  },
  {
    field: "dv_conta",
    startPos: 71,
    endPos: 71,
    length: 1,
    required: false,
    type: "numeric",
    default: " ",
  },
  {
    field: "dac",
    startPos: 72,
    endPos: 72,
    length: 1,
    required: false,
    default: " ",
  },
  {
    field: "empresa_nome",
    startPos: 73,
    endPos: 102,
    length: 30,
    required: true,
    type: "alphanumeric",
  },
  {
    field: "finalidade",
    startPos: 103,
    endPos: 142,
    length: 40,
    required: false,
    type: "alphanumeric",
    default: new Array(40).fill(" ").join(""), //^ Rever o manual caso necessário
  },
  {
    field: "endereco_empresa",
    startPos: 143,
    endPos: 172,
    length: 30,
    required: false,
    type: "alphanumeric",
  },
  {
    field: "endereco_num",
    startPos: 173,
    endPos: 177,
    length: 5,
    required: false,
    type: "alphanumeric", //^ Em alguns o numero é SN
  },
  {
    field: "endereco_compl",
    startPos: 178,
    endPos: 192,
    length: 15,
    required: false,
    type: "alphanumeric",
  },
  {
    field: "cidade",
    startPos: 193,
    endPos: 212,
    length: 20,
    required: false,
    type: "alphanumeric",
  },
  {
    field: "cep",
    startPos: 213,
    endPos: 220,
    length: 8,
    required: false,
    type: "numeric",
  },
  {
    field: "uf",
    startPos: 221,
    endPos: 222,
    length: 2,
    required: false,
    type: "alphanumeric",
  },
  {
    field: "indicativo_forma_pagamento",
    startPos: 223,
    endPos: 224,
    length: 2,
    required: true,
    default: 1,
    type: "numeric",
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
    field: "codigos_ocorrencias",
    startPos: 231,
    endPos: 240,
    length: 10,
    required: false,
    default: new Array(10).fill(" ").join(""),
  },
];
