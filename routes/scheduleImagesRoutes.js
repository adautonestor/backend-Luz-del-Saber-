const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getAll, getById, getByGradeAndSection, create, update, remove, serveImage } = require('../controllers/scheduleImagesController');
const { verificarToken } = require('../middleware/auth');
const { useWasabi } = require('../middleware/upload');

// Crear carpeta uploads/schedules si no existe (solo para desarrollo)
const uploadsDir = path.join(__dirname, '..', 'uploads', 'schedules');
if (!useWasabi && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 [SCHEDULES] Carpeta uploads/schedules creada');
}

// Configurar multer según el entorno
const storage = useWasabi
  ? multer.memoryStorage() // Producción: memoria para luego subir a Wasabi
  : multer.diskStorage({    // Desarrollo: disco local
      destination: (req, file, cb) => {
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');
        cb(null, `${timestamp}_${sanitizedName}${ext}`);
      }
    });

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Solo permitir imágenes
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

console.log(`🔧 [SCHEDULES] Modo de almacenamiento: ${useWasabi ? 'WASABI S3' : 'LOCAL'}`);

const verificarRolesPermitidos = (req, res, next) => {
  const rol = req.user?.id_rol;
  if (![1, 2, 3, 4].includes(rol)) {
    return res.status(403).json({ mensaje: 'Acceso denegado: Rol no autorizado' });
  }
  next();
};

// Ruta pública para servir imágenes (SIN autenticación)
// La key de S3 viene URL encoded: /file/schedules%2Falumnos%2Fnivel_1%2F...
router.get('/file/:key', serveImage);

// Rutas protegidas
router.use(verificarToken, verificarRolesPermitidos);

router.get('/', getAll);
router.get('/:id', getById);
router.get('/grade/:gradeId/section/:sectionId/year/:yearId', getByGradeAndSection);
router.post('/', upload.single('imagen'), create);
router.put('/:id', upload.single('imagen'), update);
router.delete('/:id', remove);

module.exports = router;
