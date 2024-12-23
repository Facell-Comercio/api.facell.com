function calcularSegmento({ meta, realizado}){
    return { meta, realizado, atingimento: realizado / meta }
}

module.exports = {
    // APARELHO
    'FAT_APARELHO_VENDAS_INDIRETAS': (data) => {
        if(!data.realizado.aparelho_indiretas)
        calcularSegmento({ meta: data.meta, realizado: data.realizado, valor: fatAparelho })
    },
    'FAT_APARELHO_ANDROID_COM_MOVIMENTACAO': data => calcularSegmento({ meta, subsegmento: 'android_movimentacao' }),
    'FAT_APARELHO_ANDROID_SEM_MOVIMENTACAO': data => calcularSegmento({ meta, subsegmento: 'android_sem_movimentacao' }),
    'FAT_APARELHO_APPLE_COM_MOVIMENTACAO': data => calcularSegmento({ meta, subsegmento: 'apple_movimentacao' }),
    'FAT_APARELHO_APPLE_SEM_MOVIMENTACAO': data => calcularSegmento({ meta, subsegmento: 'apple_sem_movimentacao' }),

    'FAT_APARELHO': data => calcularSegmento({ meta }),
    'FAT_APARELHO_COM_MOVIMENTACAO': data => calcularSegmento({ meta,  subsegmento: 'com_movimentacao' }),
    'FAT_APARELHO_SEM_MOVIMENTACAO': data => calcularSegmento({ meta,  subsegmento: 'sem_movimentacao' }),

    // ACESSORIO
    'FAT_ACESSORIO': data => calcularAcessorio({ meta }),
    'FAT_ACESSORIO_SEM_JBL': data => calcularAcessorio({ meta, subsegmento: 'sem_jbl' }),
    'FAT_ACESSORIO_JBL': data => calcularAcessorio({ meta, subsegmento: 'jbl' }),

    // PITZI
    'FAT_PITZI': data => calcularPitzi({ meta }),

    // RECEITA
    'FAT_RECEITA': data => calcularReceita({ meta }),

    // CONTROLE
    'QTD_CONTROLE_A_SEM_PORTAB': data => calcularControle({ meta, subsegmento: 'apenas_a' }),
    'QTD_CONTROLE_A_COM_PORTAB': data => calcularControle({ meta, subsegmento: 'apenas_a_portab' }),
    'QTD_CONTROLE_SEM_A_SEM_PORTAB': data => calcularControle({ meta, subsegmento: 'sem_a_sem_portab' }),
    'QTD_CONTROLE_SEM_A_COM_PORTAB': data => calcularControle({ meta, subsegmento: 'apenas_a_sem_portab' }),

    // VOZ
    'QTD_VOZ': data => calcularVoz({ meta }),
    'QTD_VOZ_INDIVIDUAL_SEM_PORTAB': data => calcularVoz({ meta, subsegmento: 'individual_sem_portab' }),
    'QTD_VOZ_INDIVIDUAL_COM_PORTAB': data => calcularVoz({ meta, subsegmento: 'individual_com_portab' }),
    'QTD_VOZ_MULTI_TITULAR_SEM_PORTAB': data => calcularVoz({ meta, subsegmento: 'titular_sem_portab' }),
    'QTD_VOZ_MULTI_TITULAR_COM_PORTAB': data => calcularVoz({ meta, subsegmento: 'titular_com_portab' }),

    // UPGRADE
    'QTD_UPGRADE': data => calcularUpgrade({ meta }),
    'QTD_UPGRADE1': data => calcularUpgrade({ meta, subsegmento: 'upgrade1' }),
    'QTD_UPGRADE2': data => calcularUpgrade({ meta, subsegmento: 'upgrade2' }),

    // MIXED
    'FAT_ACESSORIO_PITZI': data => calcularMixed({ meta,  subsegmento: 'acessorio,pitzi' }),
    'FAT_APARELHO_ACESSORIO': data => calcularMixed({ meta, subsegmento: 'aparelho,acessorio' }),
    'FAT_RECEITA_PITZI': data => calcularMixed({ meta, subsegmento: 'receita,pitzi' }),
    'FAT_APARELHO_ACESSORIO_PITZI_RECEITA': data => calcularMixed({ meta,  subsegmento: 'aparelho,acessorio,pitzi,receita' }),
    'FAT_APARELHO_ACESSORIO_PITZI_VENDAS_INDIRETAS': data => calcularMixed({ meta, cargo: 'vendas_indiretas', subsegmento: 'aparelho,acessorio,pitzi,receita' }),
    
    // BONUS
    'BONUS_METAS_FACELL': data => calcularBonus({ meta, subsegmento: 'metas_facell' }),
    'BONUS_METAS_TIM': data => calcularBonus({ meta, subsegmento: 'metas_tim' }),
    'BONUS_TODAS_METAS': data => calcularBonus({ meta, subsegmento: 'todas_metas' }),
    'BONUS_META_VOZ_GRUPO': data => calcularBonus({ meta, cargo: 'grupo', subsegmento: 'voz' }),
    'BONUS_METAS_FACELL_GERENTE': data => calcularBonus({ meta,  subsegmento: 'metas_facell' }),
    'BONUS_METAS_TIM_GERENTE': data => calcularBonus({ meta,  subsegmento: 'metas_tim' }),
    'BONUS_TODAS_METAS_GERENTE': data => calcularBonus({ meta,  subsegmento: 'todas_metas' }),
    'BONUS_TODAS_METAS_COODENADOR_COMPRAS': data => calcularBonus({ meta, cargo: 'coordenador_compras', subsegmento: 'todas_metas' }),
    'BONUS_TODAS_METAS_COORDENADOR_COMERCIAL': data => calcularBonus({ meta, cargo: 'coordenador_comercial', subsegmento: 'todas_metas' }),
    
    'BONUS_RANKING_RAIOX_COORDENADOR': data => calcularBonus({ meta, subsegmento: 'ranking_raiox_coordenador' }),
}   