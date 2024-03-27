function checkUserPermission(permission) {
    return function (req, res, next){
        const permissoes = req.user?.permissoes
        const index = permissoes?.findIndex(perm=>perm.nome === permission)

        if (permissoes && index >= 0) {
            next();
        } else {
            res.status(403).json({ message: 'Acesso negado. É necessário ter a permissão: '+ permission });
        }
    }
}

module.exports = checkUserPermission;