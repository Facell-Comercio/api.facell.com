const checkUserDepartment = (req, depart)=>{
    const user = req.user
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

module.exports = {
    checkUserDepartment
}