const { S3Client } = require('@aws-sdk/client-s3');

/**
 * Configuración del cliente S3 para Wasabi
 * Usando AWS SDK v3
 */

// Solo crear cliente si estamos en producción y tenemos credenciales
const useWasabi = process.env.NODE_ENV === 'production';

let s3Client = null;

if (useWasabi) {
  // Verificar que tenemos las credenciales necesarias
  const requiredVars = ['WASABI_ACCESS_KEY', 'WASABI_SECRET_KEY', 'WASABI_BUCKET_NAME', 'WASABI_REGION', 'WASABI_ENDPOINT'];
  const missingVars = requiredVars.filter(v => !process.env[v]);

  if (missingVars.length > 0) {
    console.warn(`⚠️ [WASABI] Variables faltantes: ${missingVars.join(', ')}`);
    console.warn('⚠️ [WASABI] Se usará almacenamiento local en su lugar');
  } else {
    s3Client = new S3Client({
      credentials: {
        accessKeyId: process.env.WASABI_ACCESS_KEY,
        secretAccessKey: process.env.WASABI_SECRET_KEY,
      },
      region: process.env.WASABI_REGION,
      endpoint: process.env.WASABI_ENDPOINT,
      forcePathStyle: true, // Requerido para Wasabi
    });
    console.log('✅ [WASABI] Cliente S3 configurado correctamente');
    console.log(`   Bucket: ${process.env.WASABI_BUCKET_NAME}`);
    console.log(`   Region: ${process.env.WASABI_REGION}`);
  }
} else {
  console.log('📁 [STORAGE] Modo LOCAL - Archivos se guardarán en backend/uploads/');
}

module.exports = {
  s3Client,
  bucketName: process.env.WASABI_BUCKET_NAME,
  backupBucketName: process.env.WASABI_BACKUP_BUCKET,
  useWasabi: useWasabi && s3Client !== null
};
