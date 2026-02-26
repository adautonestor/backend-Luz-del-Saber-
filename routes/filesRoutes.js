const express = require('express');
const router = express.Router();
const { getFromStorage, existsInStorage } = require('../middleware/upload');

/**
 * Handler común para servir archivos
 */
const serveFile = async (key, res) => {
  try {
    console.log(`📥 [FILES] Solicitando archivo: ${key}`);

    // Verificar si existe
    const exists = await existsInStorage(key);
    if (!exists) {
      console.log(`❌ [FILES] Archivo no encontrado: ${key}`);
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    // Obtener archivo
    const { stream, contentType, contentLength } = await getFromStorage(key);

    // Configurar headers
    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache 1 año

    // Enviar archivo
    stream.pipe(res);

  } catch (error) {
    console.error(`❌ [FILES] Error sirviendo archivo:`, error);
    res.status(500).json({ error: 'Error al obtener archivo' });
  }
};

// Ruta para paths con 1 nivel: /api/files/filename.jpg
router.get('/:file', async (req, res) => {
  const key = req.params.file;
  await serveFile(key, res);
});

// Ruta para paths con 2 niveles: /api/files/folder/filename.jpg
router.get('/:folder/:file', async (req, res) => {
  const key = `${req.params.folder}/${req.params.file}`;
  await serveFile(key, res);
});

// Ruta para paths con 3 niveles: /api/files/folder/subfolder/filename.jpg
router.get('/:folder/:subfolder/:file', async (req, res) => {
  const key = `${req.params.folder}/${req.params.subfolder}/${req.params.file}`;
  await serveFile(key, res);
});

// Ruta para paths con 4 niveles: /api/files/contracts/student_4/year_16/filename.pdf
router.get('/:folder/:subfolder1/:subfolder2/:file', async (req, res) => {
  const key = `${req.params.folder}/${req.params.subfolder1}/${req.params.subfolder2}/${req.params.file}`;
  await serveFile(key, res);
});

module.exports = router;
