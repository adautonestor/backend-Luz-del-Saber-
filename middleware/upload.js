const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand
} = require('@aws-sdk/client-s3');
const { s3Client, bucketName, useWasabi } = require('../config/wasabi');

/**
 * Middleware de Upload Híbrido
 *
 * PRODUCCIÓN (NODE_ENV=production): Sube a Wasabi S3
 * DESARROLLO (NODE_ENV=development): Guarda en backend/uploads/
 */

// Crear carpeta uploads si no existe (solo para desarrollo)
const uploadsDir = path.join(__dirname, '..', 'uploads');
const schedulesDir = path.join(uploadsDir, 'schedules');
const contractsDir = path.join(uploadsDir, 'contracts');
const psychReportsDir = path.join(uploadsDir, 'psychological-reports');
const communicationsDir = path.join(uploadsDir, 'communications');
const logoDir = path.join(uploadsDir, 'logo');
const announcementsDir = path.join(uploadsDir, 'announcements');

if (!useWasabi) {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  if (!fs.existsSync(schedulesDir)) {
    fs.mkdirSync(schedulesDir, { recursive: true });
  }
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }
  if (!fs.existsSync(psychReportsDir)) {
    fs.mkdirSync(psychReportsDir, { recursive: true });
  }
  if (!fs.existsSync(communicationsDir)) {
    fs.mkdirSync(communicationsDir, { recursive: true });
  }
  if (!fs.existsSync(logoDir)) {
    fs.mkdirSync(logoDir, { recursive: true });
  }
  if (!fs.existsSync(announcementsDir)) {
    fs.mkdirSync(announcementsDir, { recursive: true });
  }
  console.log('📁 [UPLOAD] Carpetas locales configuradas');
}

// Configurar almacenamiento según entorno
const storage = useWasabi
  ? multer.memoryStorage() // Producción: usar memoria para luego subir a S3
  : multer.diskStorage({    // Desarrollo: usar disco local
      destination: (req, file, cb) => {
        // Determinar carpeta según el tipo de archivo
        let folder = uploadsDir;
        if (req.baseUrl.includes('schedule')) {
          folder = schedulesDir;
        } else if (req.baseUrl.includes('matriculation') || req.baseUrl.includes('contract')) {
          folder = contractsDir;
        } else if (req.baseUrl.includes('psychological-reports')) {
          folder = psychReportsDir;
        } else if (req.baseUrl.includes('communications')) {
          folder = communicationsDir;
        } else if (req.baseUrl.includes('system-settings') && req.path.includes('logo')) {
          folder = logoDir;
        } else if (req.baseUrl.includes('avisos')) {
          folder = announcementsDir;
        }
        cb(null, folder);
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');
        cb(null, `${timestamp}_${sanitizedName}${ext}`);
      }
    });

console.log(`🔧 [UPLOAD] Modo de almacenamiento: ${useWasabi ? 'WASABI S3' : 'LOCAL'}`);

// Validador de archivos - imágenes
const fileFilterImages = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
  }
};

// Validador de archivos - documentos
const fileFilterDocuments = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif'
  ];

  const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.gif'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido`), false);
  }
};

// Configurar multer para imágenes
const uploadImages = multer({
  storage: storage,
  fileFilter: fileFilterImages,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  }
});

// Configurar multer para documentos
const uploadDocuments = multer({
  storage: storage,
  fileFilter: fileFilterDocuments,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5
  }
});

/**
 * Subir archivo según entorno (HÍBRIDO)
 * PRODUCCIÓN: Sube a Wasabi S3
 * DESARROLLO: Archivo ya está guardado en disco, solo retorna path relativo
 *
 * @param {Buffer|String} fileBufferOrPath - Buffer (producción) o path (desarrollo)
 * @param {string} key - Key/path en S3 o nombre de archivo local
 * @param {string} mimetype - Tipo MIME del archivo
 * @param {Object} file - Objeto file de multer (opcional, para desarrollo)
 * @returns {Promise<string>} - Key (producción) o path relativo (desarrollo)
 */
const uploadToStorage = async (fileBufferOrPath, key, mimetype, file = null) => {
  if (useWasabi) {
    // PRODUCCIÓN: Subir a Wasabi
    try {
      console.log(`📤 [WASABI] Subiendo archivo: ${key}`);

      const uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: fileBufferOrPath, // Buffer
        ContentType: mimetype,
        Metadata: {
          'uploaded-by': 'luz-del-saber-system',
          'upload-timestamp': new Date().toISOString()
        }
      };

      await s3Client.send(new PutObjectCommand(uploadParams));

      console.log(`✅ [WASABI] Archivo subido exitosamente: ${key}`);
      return key; // Retornar key de S3

    } catch (error) {
      console.error(`❌ [WASABI] Error subiendo archivo:`, error);
      throw new Error(`Error al subir archivo a Wasabi: ${error.message}`);
    }
  } else {
    // DESARROLLO: Archivo ya está en disco, solo retornar path relativo
    const filename = file ? file.filename : path.basename(fileBufferOrPath);
    const folder = key.includes('schedules') ? 'uploads/schedules' : 'uploads';
    console.log(`✅ [LOCAL] Archivo guardado localmente: ${filename}`);
    return `${folder}/${filename}`; // Retornar path relativo
  }
};

/**
 * Eliminar archivo según entorno (HÍBRIDO)
 * PRODUCCIÓN: Elimina de Wasabi S3
 * DESARROLLO: Elimina de carpeta local uploads/
 *
 * @param {string} keyOrPath - Key de S3 o path relativo local
 * @returns {Promise<boolean>}
 */
const deleteFromStorage = async (keyOrPath) => {
  if (useWasabi) {
    // PRODUCCIÓN: Eliminar de Wasabi
    try {
      console.log(`🗑️ [WASABI] Eliminando archivo: ${keyOrPath}`);

      const deleteParams = {
        Bucket: bucketName,
        Key: keyOrPath
      };

      await s3Client.send(new DeleteObjectCommand(deleteParams));

      console.log(`✅ [WASABI] Archivo eliminado exitosamente: ${keyOrPath}`);
      return true;

    } catch (error) {
      console.error(`❌ [WASABI] Error eliminando archivo:`, error);
      throw new Error(`Error al eliminar archivo de Wasabi: ${error.message}`);
    }
  } else {
    // DESARROLLO: Eliminar de carpeta local
    try {
      const filePath = path.join(__dirname, '..', keyOrPath);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ [LOCAL] Archivo eliminado localmente: ${keyOrPath}`);
        return true;
      } else {
        console.log(`⚠️ [LOCAL] Archivo no encontrado: ${keyOrPath}`);
        return false;
      }

    } catch (error) {
      console.error(`❌ [LOCAL] Error eliminando archivo:`, error);
      throw new Error(`Error al eliminar archivo local: ${error.message}`);
    }
  }
};

/**
 * Obtener archivo desde storage (para proxy)
 * PRODUCCIÓN: Descarga de Wasabi S3
 * DESARROLLO: Lee de carpeta local
 *
 * @param {string} keyOrPath - Key de S3 o path relativo local
 * @returns {Promise<{stream, contentType, contentLength}>}
 */
const getFromStorage = async (keyOrPath) => {
  if (useWasabi) {
    // PRODUCCIÓN: Obtener de Wasabi
    try {
      console.log(`🔍 [WASABI] Obteniendo archivo: ${keyOrPath}`);

      const getParams = {
        Bucket: bucketName,
        Key: keyOrPath
      };

      const data = await s3Client.send(new GetObjectCommand(getParams));

      return {
        stream: data.Body,
        contentType: data.ContentType,
        contentLength: data.ContentLength
      };

    } catch (error) {
      console.error(`❌ [WASABI] Error obteniendo archivo:`, error);
      throw new Error(`Archivo no encontrado en Wasabi: ${keyOrPath}`);
    }
  } else {
    // DESARROLLO: Leer de carpeta local
    const filePath = path.join(__dirname, '..', keyOrPath);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Archivo no encontrado: ${keyOrPath}`);
    }

    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf'
    };

    return {
      stream: fs.createReadStream(filePath),
      contentType: mimeTypes[ext] || 'application/octet-stream',
      contentLength: stats.size
    };
  }
};

/**
 * Verificar si archivo existe en storage
 * @param {string} keyOrPath - Key de S3 o path relativo local
 * @returns {Promise<boolean>}
 */
const existsInStorage = async (keyOrPath) => {
  if (useWasabi) {
    try {
      const headParams = {
        Bucket: bucketName,
        Key: keyOrPath
      };
      await s3Client.send(new HeadObjectCommand(headParams));
      return true;
    } catch (error) {
      return false;
    }
  } else {
    const filePath = path.join(__dirname, '..', keyOrPath);
    return fs.existsSync(filePath);
  }
};

/**
 * Obtener URL del archivo según entorno (HÍBRIDO)
 * PRODUCCIÓN: URL del proxy de Wasabi
 * DESARROLLO: URL local del servidor Express
 *
 * @param {string} keyOrPath - Key de S3 o path relativo local
 * @param {string} proxyRoute - Ruta del proxy (ej: '/api/schedule-images/file')
 * @returns {string} - URL completa del archivo
 */
const getFileUrl = (keyOrPath, proxyRoute = '/api/files') => {
  const backendUrl = process.env.BACKEND_URL;

  if (useWasabi) {
    // PRODUCCIÓN: URL del proxy con key codificada
    return `${backendUrl}${proxyRoute}/${encodeURIComponent(keyOrPath)}`;
  } else {
    // DESARROLLO: URL directa al archivo local
    // Si es un path relativo como "uploads/schedules/file.jpg", usamos eso
    return `${backendUrl}/${keyOrPath}`;
  }
};

// Helpers para generar keys/paths
const generateUniqueFilename = (prefix, originalname) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const extension = originalname.split('.').pop().toLowerCase();
  return `${prefix}_${timestamp}.${extension}`;
};

const generateScheduleKey = (type, levelId, gradeId, sectionId, filename) => {
  if (type === 'alumnos') {
    return `schedules/alumnos/nivel_${levelId}/grado_${gradeId}/seccion_${sectionId}/${filename}`;
  } else {
    return `schedules/docentes/nivel_${levelId}/${filename}`;
  }
};

/**
 * Generar key para contratos de matrícula
 * @param {number} studentId - ID del estudiante
 * @param {number} academicYear - Año académico
 * @param {string} filename - Nombre del archivo
 * @returns {string} Key para S3
 */
const generateContractKey = (studentId, academicYear, filename) => {
  return `contracts/student_${studentId}/year_${academicYear}/${filename}`;
};

module.exports = {
  // Middlewares Multer
  uploadSingleImage: uploadImages,
  uploadSingleDocument: uploadDocuments,
  uploadMultipleDocuments: uploadDocuments,
  uploadMultipleFiles: uploadDocuments, // Para avisos (imagen + archivo)

  // Funciones híbridas
  uploadToStorage,
  deleteFromStorage,
  getFromStorage,
  existsInStorage,
  getFileUrl,

  // Helpers
  generateUniqueFilename,
  generateScheduleKey,
  generateContractKey,

  // Flag de modo
  useWasabi,

  // Directorios
  uploadsDir,
  schedulesDir,
  contractsDir,
  announcementsDir
};
