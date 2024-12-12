// OK
module.exports = [
    {
        field: 'banco',
        startPos: 1,
        endPos: 3,
        length: 3,
        required: true,
        default: 237
    },
    {
        field: 'lote',
        startPos: 4,
        endPos: 7,
        length: 4,
        required: true,
        default: '0000'
    },
    {
        field: 'registro',
        startPos: 8,
        endPos: 8,
        length: 1,
        required: true,
        default: 3
    },
    {
        field: 'num_seq_registro_lote',
        startPos: 9,
        endPos: 13,
        length: 5,
        required: true,
        type: 'numeric'
    },
    {
        field: 'cod_seg_registro_lote',
        startPos: 14,
        endPos: 14,
        length: 1,
        required: true,
        default: 'D',
        type: 'alphanumeric'
    },
    {
        field: 'brancos1',
        startPos: 15,
        endPos: 17,
        length: 3,
        type: 'alphanumeric',
        default: new Array(3).fill(' ').join(''),
    },
    {
        field: 'mes_ano_pagamento',
        startPos: 18,
        endPos: 23,
        length: 6,
        required: true,
        type: 'numeric',
    },
    {
        field: 'centro_custo',
        startPos: 24,
        endPos: 38,
        length: 15,
        required: true,
        type: 'alphanumeric'
    },
    {
        field: 'cod_funcionario',
        startPos: 39,
        endPos: 53,
        length: 15,
        required: true,
        type: 'alphanumeric'
    },
    {
        field: 'cargo',
        startPos: 54,
        endPos: 83,
        length: 30,
        required: true,
    },
    {
        field: 'ferias_de',
        startPos: 84,
        endPos: 91,
        length: 8,
        type: 'numeric'
    },
    {
        field: 'ferias_ate',
        startPos: 92,
        endPos: 99,
        length: 8,
        type: 'numeric'
    },
    {
        field: 'qtde_dep_imp_renda',
        startPos: 100,
        endPos: 101,
        length: 2,
        type: 'numeric'
    },
    {
        field: 'qtde_dep_salario_fam',
        startPos: 102,
        endPos: 103,
        length: 2,
        type: 'numeric'
    },
    {
        field: 'horas_semanais',
        startPos: 104,
        endPos: 105,
        length: 2,
        type: 'numeric'
    },
    {
        field: 'valor_salario_contrib',
        startPos: 106,
        endPos: 120,
        length: 15,
        required: true,
        type: 'numeric',
        format: 'float',
    },
    {
        field: 'valor_fgts',
        startPos: 121,
        endPos: 135,
        length: 15,
        required: true,
        type: 'numeric',
        format: 'float',
    },
    {
        field: 'valor_credito',
        startPos: 136,
        endPos: 150,
        length: 15,
        required: true,
        type: 'numeric',
        format: 'float',
    },
    {
        field: 'valor_debito',
        startPos: 151,
        endPos: 165,
        length: 15,
        required: true,
        type: 'numeric',
        format: 'float',
    },
    {
        field: 'valor_liquido',
        startPos: 166,
        endPos: 180,
        length: 15,
        required: true,
        type: 'numeric',
        format: 'float',
    },
    {
        field: 'valor_base',
        startPos: 181,
        endPos: 195,
        length: 15,
        required: true,
        type: 'numeric',
        format: 'float',
    },
    {
        field: 'valor_base_irrf',
        startPos: 196,
        endPos: 210,
        length: 15,
        required: true,
        type: 'numeric',
        format: 'float',
    },
    {
        field: 'valor_base_fgts',
        startPos: 211,
        endPos: 225,
        length: 15,
        required: true,
        type: 'numeric',
        format: 'float',
    },
    {
        field: 'disponibilizacao',
        startPos: 226,
        endPos: 227,
        length: 2,
        required: true,
        type: 'alphanumeric'
    },
    {
        field: 'brancos2',
        startPos: 228,
        endPos: 230,
        length: 3,
        default: new Array(3).fill(' ').join(''),
        type: 'alphanumeric'
    },
    {
        field: 'cod_ocorrencia',
        startPos: 231,
        endPos: 240,
        length: 10,
        type: 'alphanumeric'
    },
];
