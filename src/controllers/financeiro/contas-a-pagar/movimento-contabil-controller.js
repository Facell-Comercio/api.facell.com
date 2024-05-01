const { createUploadsPath, zipFiles } = require("../../files-controller");

function downloadMovimentoContabil(req, res) {
    return new Promise(async (resolve, reject) => {
        try {
            // const { type, idSelection } = req.body || {
            // };

            const zip = await zipFiles(
                {
                    items: [
                        {
                            type: 'folder',
                            folderName: 'arquivos',
                            items: [
                                {
                                    type: 'folder',
                                    folderName: '01',
                                    items: [
                                        { type: 'file', fileName: 'IMG Alex.jpg', filePath: createUploadsPath('eu_n7gr6lo82xvjv7cxaq417nje.jpg') },
                                        { type: 'file', fileName: 'IMG Leandro.png', filePath: createUploadsPath('Leandro_mx77q4c8372vfyf5vmx9qdp7.png') },
                                    ]
                                },
                                {
                                    type: 'folder',
                                    folderName: '02',
                                    items: [
                                        { type: 'file', fileName: 'BOLETO 102030.pdf', filePath: createUploadsPath('NOTAS_-_Manual_Tecnico_SISPAG__kqx5ixqs9oq3k1bzwmmlqa0k.pdf') },
                                        { type: 'file', fileName: 'BOLETO 111213.pdf', filePath: createUploadsPath('Parcial 04-04 17_iwptugddgzbrljwretm1aje2.pdf') },
                                    ]
                                },

                            ]
                        },
                        {
                            type: 'file', fileName: 'Relatório.xlsx', filePath: createUploadsPath('rateio-novo-titulo_ap7iu8h7ns4uaw296q9kfcyj.xlsx')
                        }
                    ]
                }
            )
            res.set('Content-Type', 'application/zip');
            res.set('Content-Disposition', 'attachment; filename=example.zip');
            res.send(zip);
            resolve()
        } catch (error) {
            reject(error)
        }
    })
}

module.exports = {
    downloadMovimentoContabil
}