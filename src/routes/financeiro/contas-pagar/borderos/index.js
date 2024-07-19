const router = require('express').Router();
const multer = require('multer');
const checkUserAuthorization = require('../../../../middlewares/authorization-middleware');

const {
  getAll,
  getOne,
  insertOne,
  update,
  deleteBordero,
  transferBordero,
  exportBorderos,
  deleteVencimento,
  geradorDadosEmpresa,
  importRetornoRemessa,
  reverseManualPayment,
  findNewItems,
  pagamentoItens,
  exportRemessa,
} = require('../../../../controllers/financeiro/contas-a-pagar/borderos-controller');

const { localTempStorage } = require('../../../../libs/multer');
const upload = multer({ storage: localTempStorage });

router.get('/procurar-novos-itens', async (req, res) => {
  try {
    const result = await findNewItems(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/transfer', async (req, res) => {
  try {
    const result = await transferBordero(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/export', async (req, res) => {
  try {
    const result = await exportBorderos(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await getAll(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get(
  '/gerador',
  checkUserAuthorization('FINANCEIRO', 'OR', 'MASTER'),
  async (req, res) => {
    try {
      const result = await geradorDadosEmpresa(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.get('/:id', async (req, res) => {
  try {
    const result = await getOne(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.post('/export-remessa', async (req, res) => {
  try {
    const response = await exportRemessa(req, res);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

const multipleUpload = upload.array('files', 100);
router.post('/:id/import-retorno-remessa', async (req, res) => {
  multipleUpload(req, res, async (err) => {
    if (err) {
      return res.status(500).json({
        message: 'Ocorreu algum problema com o(s) arquivo(s) enviado(s)',
      });
    } else {
      try {
        const result = await importRetornoRemessa(req);
        res.status(200).json(result);
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    }
  });
});

router.post(
  '/pagamento',
  checkUserAuthorization('FINANCEIRO', 'OR', 'MASTER'),
  async (req, res) => {
    try {
      const result = await pagamentoItens(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.post(
  '/',
  checkUserAuthorization('FINANCEIRO', 'OR', 'MASTER'),
  async (req, res) => {
    try {
      const result = await insertOne(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.put(
  '/',
  checkUserAuthorization('FINANCEIRO', 'OR', 'MASTER'),
  async (req, res) => {
    try {
      const result = await update(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.put(
  '/reverse-manual-payment/:id',
  checkUserAuthorization('FINANCEIRO', 'OR', 'MASTER'),
  async (req, res) => {
    try {
      const result = await reverseManualPayment(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.delete('/titulo/:id', async (req, res) => {
  try {
    const result = await deleteVencimento(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await deleteBordero(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
