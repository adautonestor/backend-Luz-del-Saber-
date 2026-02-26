const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Detectar si se usa Wasabi S3
const useWasabi = !!(process.env.WASABI_ACCESS_KEY && process.env.WASABI_SECRET_KEY && process.env.WASABI_BUCKET_NAME);

// Configuración de almacenamiento para vouchers de pago
// Si Wasabi está habilitado, usar memoryStorage para obtener el buffer
// Si no, usar diskStorage para guardar localmente
const paymentReceiptsStorage = useWasabi
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '..', 'uploads', 'payment-receipts');

        // Crear el directorio si no existe
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
      },
      filename: function (req, file, cb) {
        // Generar nombre único: timestamp-random-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');

        cb(null, `voucher_${uniqueSuffix}_${sanitizedName}${ext}`);
      }
    });

// Filtro de archivos: solo JPG, PNG y PDF
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se aceptan JPG, PNG o PDF'), false);
  }
};

// Configuración de multer para vouchers de pago
const uploadPaymentReceipt = multer({
  storage: paymentReceiptsStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  }
});

// Configuración de almacenamiento para documentos generales
// Si Wasabi está habilitado, usar memoryStorage
const documentsStorage = useWasabi
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '..', 'uploads', 'documents');

        // Crear el directorio si no existe
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
      },
      filename: function (req, file, cb) {
        // Generar nombre único: timestamp-random-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');

        cb(null, `doc_${uniqueSuffix}_${sanitizedName}${ext}`);
      }
    });

// Filtro de archivos para documentos: JPG, PNG, PDF, DOC, DOCX, XLS, XLSX
const documentFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se aceptan JPG, PNG, PDF, DOC, DOCX, XLS, XLSX'), false);
  }
};

// Configuración de multer para documentos generales
const uploadDocument = multer({
  storage: documentsStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  }
});

module.exports = {
  uploadPaymentReceipt,
  uploadDocument
};
