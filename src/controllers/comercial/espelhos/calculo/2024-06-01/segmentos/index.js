const { calcularAparelho } = require('./tipos/aparelho')
const { calcularAcessorio } = require('./tipos/acessorio')
const { calcularPitzi } = require('./tipos/pitzi')
const { calcularReceita } = require('./tipos/receita')
const { calcularControle } = require('./tipos/controle')
const { calcularVoz } = require('./tipos/voz')
const { calcularUpgrade } = require('./tipos/upgrade')
const { calcularMixed } = require('./tipos/mixed')
const { calcularBonus } = require('./tipos/bonus')


module.exports = {
    // APARELHO
    'FAT_APARELHO_VENDAS_INDIRETAS': meta => calcularAparelho({ meta, cargo: 'vendas_indiretas', und: 'faturamento' }),
    'FAT_APARELHO_VENDEDOR': meta => calcularAparelho({ meta, cargo: 'vendedor', und: 'faturamento' }),
    'FAT_APARELHO_MOVIMENTACAO_VENDEDOR': meta => calcularAparelho({ meta, cargo: 'vendedor', subsegmento: 'movimentacao' }),
    'FAT_APARELHO_SEM_MOVIMENTACAO_VENDEDOR': meta => calcularAparelho({ meta, cargo: 'vendedor', subsegmento: 'sem_movimentacao' }),
    'FAT_APARELHO_ANDROID_MOVIMENTACAO_VENDEDOR': meta => calcularAparelho({ meta, cargo: 'vendedor', subsegmento: 'android_movimentacao' }),
    'FAT_APARELHO_ANDROID_SEM_MOVIMENTACAO_VENDEDOR': meta => calcularAparelho({ meta, cargo: 'vendedor', subsegmento: 'android_sem_movimentacao' }),
    'FAT_APARELHO_APPLE_MOVIMENTACAO_VENDEDOR': meta => calcularAparelho({ meta, cargo: 'vendedor', subsegmento: 'apple_movimentacao' }),
    'FAT_APARELHO_APPLE_SEM_MOVIMENTACAO_VENDEDOR': meta => calcularAparelho({ meta, cargo: 'vendedor', subsegmento: 'apple_sem_movimentacao' }),

    'FAT_APARELHO_LOJA': meta => calcularAparelho({ meta, cargo: 'filial', und: 'faturamento' }),
    'FAT_APARELHO_MOVIMENTACAO_LOJA': meta => calcularAparelho({ meta, cargo: 'filial', subsegmento: 'movimentacao' }),
    'FAT_APARELHO_SEM_MOVIMENTACAO_LOJA': meta => calcularAparelho({ meta, cargo: 'filial', subsegmento: 'sem_movimentacao' }),

    'QTDE_APARELHO_VENDEDOR': meta => calcularAparelho({ meta, cargo: 'vendedor', und: 'qtde' }),
    'QTDE_APARELHO_LOJA': meta => calcularAparelho({ meta, cargo: 'filial', und: 'qtde' }),

    // ACESSORIO
    'FAT_ACESSORIO_VENDEDOR': meta => calcularAcessorio({ meta, cargo: 'vendedor' }),
    'FAT_ACESSORIO_SEM_JBL_VENDEDOR': meta => calcularAcessorio({ meta, cargo: 'vendedor', subsegmento: 'sem_jbl' }),
    'FAT_ACESSORIO_JBL_VENDEDOR': meta => calcularAcessorio({ meta, cargo: 'vendedor', subsegmento: 'jbl' }),
    'FAT_ACESSORIO_LOJA': meta => calcularAcessorio({ meta, cargo: 'filial' }),

    // PITZI
    'FAT_PITZI_VENDEDOR': meta = calcularPitzi({ meta, cargo: 'vendedor' }),
    'FAT_PITZI_LOJA': meta = calcularPitzi({ meta, cargo: 'filial' }),

    // RECEITA
    'FAT_RECEITA_VENDEDOR': meta => calcularReceita({ meta, cargo: 'vendedor' }),
    'FAT_RECEITA_LOJA': meta => calcularReceita({ meta, cargo: 'filial' }),

    // CONTROLE
    'QTD_CONTROLE_VENDEDOR': meta => calcularControle({ meta, cargo: 'vendedor' }),
    'QTD_CONTROLE_SEM_PORTABILIDADE_VENDEDOR': meta => calcularControle({ meta, cargo: 'vendedor', subsegmento: 'sem_portab' }),
    'QTD_CONTROLE_PORTABILIDADE_VENDEDOR': meta => calcularControle({ meta, cargo: 'vendedor', subsegmento: 'com_portab' }),
    'QTD_CONTROLE_A_VENDEDOR': meta => calcularControle({ meta, cargo: 'vendedor', subsegmento: 'apenas_a' }),
    'QTD_CONTROLE_A_PORTABILIDADE_VENDEDOR': meta => calcularControle({ meta, cargo: 'vendedor', subsegmento: 'apenas_a_portab' }),
    'QTD_CONTROLE_SEM_A_SEM_PORTABILIDADE_VENDEDOR': meta => calcularControle({ meta, cargo: 'vendedor', subsegmento: 'sem_a_sem_portab' }),
    'QTD_CONTROLE_A_SEM_PORTABILIDADE_VENDEDOR': meta => calcularControle({ meta, cargo: 'vendedor', subsegmento: 'apenas_a_sem_portab' }),
    'QTD_CONTROLE_PORTABILIDADE_SEM_A_VENDEDOR': meta => calcularControle({ meta, cargo: 'vendedor', subsegmento: 'com_portab_sem_a' }),
    'QTD_CONTROLE_LOJA': meta => calcularControle({ meta, cargo: 'filial' }),

    // VOZ
    'QTD_VOZ_VENDEDOR': meta => calcularVoz({ meta, cargo: 'vendedor' }),
    'QTD_VOZ_INDIVIDUAL_VENDEDOR': meta => calcularVoz({ meta, cargo: 'vendedor', subsegmento: 'individual' }),
    'QTD_VOZ_INDIVIDUAL_SEM_PORTABILIDADE_VENDEDOR': meta => calcularVoz({ meta, cargo: 'vendedor', subsegmento: 'individual_sem_portab' }),
    'QTD_VOZ_INDIVIDUAL_PORTABILIDADE_VENDEDOR': meta => calcularVoz({ meta, cargo: 'vendedor', subsegmento: 'individual_com_portab' }),
    'QTD_VOZ_MULTI_TITULAR_VENDEDOR': meta => calcularVoz({ meta, cargo: 'vendedor', subsegmento: 'titular' }),
    'QTD_VOZ_MULTI_TITULAR_SEM_PORTABILIDADE_VENDEDOR': meta => calcularVoz({ meta, cargo: 'vendedor', subsegmento: 'titular_sem_portab' }),
    'QTD_VOZ_MULTI_TITULAR_PORTABILIDADE_VENDEDOR': meta => calcularVoz({ meta, cargo: 'vendedor', subsegmento: 'titular_com_portab' }),
    'QTD_VOZ_LOJA': meta => calcularVoz({ meta, cargo: 'filial' }),

    // UPGRADE
    'QTD_UPGRADE_VENDEDOR': meta => calcularUpgrade({ meta, cargo: 'vendedor', }),
    'QTD_UPGRADE1_VENDEDOR': meta => calcularUpgrade({ meta, cargo: 'vendedor', subsegmento: 'upgrade1' }),
    'QTD_UPGRADE2_VENDEDOR': meta => calcularUpgrade({ meta, cargo: 'vendedor', subsegmento: 'upgrade2' }),
    'QTD_UPGRADE_LOJA': meta => calcularUpgrade({ meta, cargo: 'filial' }),

    // MIXED
    'FAT_APARELHO_ACESSORIO_VENDEDOR': meta=> calcularMixed({meta, cargo: 'vendedor', subsegmento: 'aparelho,acessorio'}),
    'FAT_ACESSORIO_PITZI_LOJA': meta=> calcularMixed({meta, cargo: 'filial', subsegmento: 'acessorio,pitzi'}),
    'FAT_ACESSORIO_PITZI_VENDEDOR': meta=> calcularMixed({meta, cargo: 'vendedor', subsegmento: 'acessorio,pitzi'}),
    'FAT_RECEITA_PITZI_VENDEDOR': meta=> calcularMixed({meta, cargo: 'vendedor', subsegmento: 'receita,pitzi'}),
    'FAT_APARELHO_ACESSORIO_PITZI_VENDAS_INDIRETAS': meta=> calcularMixed({meta, cargo: 'vendas_indiretas', subsegmento: 'aparelho,acessorio,pitzi,receita'}),
    'FAT_APARELHO_ACESSORIO_PITZI_RECEITA_LOJA': meta=> calcularMixed({meta, cargo: 'filial', subsegmento: 'aparelho,acessorio,pitzi,receita'}),

    // BONUS
    'BONUS_RANKING_RAIOX_COORDENADOR': meta=> calcularBonus({meta, cargo: 'vendedor', subsegmento: 'ranking_raiox_coordenador'}),
    'BONUS_METAS_FACELL_VENDEDOR': meta=> calcularBonus({meta, cargo: 'vendedor', subsegmento: 'metas_facell'}),
    'BONUS_METAS_TIM_VENDEDOR': meta=> calcularBonus({meta, cargo: 'vendedor', subsegmento: 'metas_tim'}),
    'BONUS_TODAS_METAS_VENDEDOR': meta=> calcularBonus({meta, cargo: 'vendedor', subsegmento: 'todas_metas'}),
    'BONUS_VOZ_GRUPO_ECONOMICO': meta=> calcularBonus({meta, cargo: 'grupo', subsegmento: 'voz'}),
    'BONUS_METAS_FACELL_GERENTE': meta=> calcularBonus({meta, cargo: 'filial', subsegmento: 'metas_facell'}),
    'BONUS_METAS_TIM_GERENTE': meta=> calcularBonus({meta, cargo: 'filial', subsegmento: 'metas_tim'}),
    'BONUS_TODAS_METAS_GERENTE': meta=> calcularBonus({meta, cargo: 'filial', subsegmento: 'todas_metas'}),
    'BONUS_TODAS_METAS_COODENADOR_COMPRAS': meta=> calcularBonus({meta, cargo: 'coordenador_compras', subsegmento: 'todas_metas'}),
    'BONUS_TODAS_METAS_COORDENADOR_COMERCIAL': meta=> calcularBonus({meta, cargo: 'coordenador_comercial', subsegmento: 'todas_metas'}),
}   
