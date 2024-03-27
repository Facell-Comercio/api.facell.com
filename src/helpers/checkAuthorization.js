export const checkUserPermission = (user, permission)=>{
    const tipo = typeof permission

    if(!user) return false;
    if(tipo !== 'string' && tipo !== 'number') return false;
    if(!user.permissoes || user.permissoes?.length === 0){
        return false;
    }
    if(tipo === 'number'){
        const index = user.permissoes.findIndex(perm=>perm.id === permission)
        return index >= 0;
    } 
    if(tipo === 'string'){
        const index = user.permissoes.findIndex(perm=>perm.nome === permission)
        return index >= 0;
    } 
    return false
}

export const checkUserDepartments = (user, depart)=>{
    const tipo = typeof depart

    if(!user) return false;
    if(tipo !== 'string' && tipo !== 'number') return false;
    if(!user.departamentos || user.departamentos?.length === 0){
        return false;
    }
    if(tipo === 'number'){
        const index = user.departamentos.findIndex(perm=>perm.id === depart)
        return index >= 0;
    } 
    if(tipo === 'string'){
        const index = user.departamentos.findIndex(perm=>perm.nome === depart)
        return index >= 0;
    } 
    return true
}