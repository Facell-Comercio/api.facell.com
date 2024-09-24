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
        field: 'brancos',
        startPos: 15,
        endPos: 17,
        length: 3,
        type: 'alphanumeric',
        default: new Array(3).fill(' ').join(''),
    },
    {
        field: 'movimento',
        startPos: 18,
        endPos: 18,
        length: 1,
        required: true,
        type: 'alphanumeric'
    },
    {
        field: 'descricao1',
        startPos: 19,
        endPos: 48,
        length: 30,
        required: true,
        type: 'alphanumeric'
    },
    {
        field: 'brancos',
        startPos: 49,
        endPos: 53,
        length: 5,
        default: new Array(5).fill(' ').join(''),
        type: 'alphanumeric'
    },
    {
        field: 'valor1',
        startPos: 54,
        endPos: 68,
        length: 15,
        required: true,
        type: 'numeric',
        format: 'float',
    },

    {
        field: 'descricao2',
        startPos: 69,
        endPos: 98,
        length: 30,
        type: 'alphanumeric'
    },
    {
        field: 'brancos',
        startPos: 99,
        endPos: 103,
        length: 5,
        default: new Array(5).fill(' ').join(''),
        type: 'alphanumeric'
    },
    {
        field: 'valor2',
        startPos: 104,
        endPos: 118,
        length: 15,
        type: 'numeric',
        format: 'float',
    },
    {
        field: 'descricao3',
        startPos: 119,
        endPos: 148,
        length: 30,
        type: 'alphanumeric'
    },
    {
        field: 'brancos',
        startPos: 149,
        endPos: 153,
        length: 5,
        default: new Array(5).fill(' ').join(''),
        type: 'alphanumeric'
    },
    {
        field: 'valor3',
        startPos: 154,
        endPos: 168,
        length: 15,
        type: 'numeric',
        format: 'float',
    },
    {
        field: 'descricao4',
        startPos: 169,
        endPos: 198,
        length: 30,
        type: 'alphanumeric'
    },
    {
        field: 'brancos',
        startPos: 199,
        endPos: 203,
        length: 5,
        default: new Array(5).fill(' ').join(''),
        type: 'alphanumeric'
    },
    {
        field: 'valor4',
        startPos: 204,
        endPos: 218,
        length: 15,
        type: 'numeric',
        format: 'float',
    },
    {
        field: 'brancos',
        startPos: 219,
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
