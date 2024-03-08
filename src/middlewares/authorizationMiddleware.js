function authorizationMiddleware({perfil, permissao}) {
    return function(req, res, next) {
        // Verificar se o usuário possui o perfil necessário
        if (req.user && req.user.perfil === perfil) {
            next(); // Permite o acesso à rota
        } else {
            res.status(403).json({ message: 'Acesso proibido. Perfil necessário: ' + perfil });
        }
    };
}

module.exports = authorizationMiddleware;