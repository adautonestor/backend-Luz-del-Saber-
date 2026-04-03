const { Pool, types } = require('pg');
require('dotenv').config();

// Forzar que PostgreSQL retorne columnas DATE (OID 1082) como string 'YYYY-MM-DD'
// en lugar de convertirlas a objetos Date (que causan desfase de timezone)
// Ejemplo: '2026-04-02' se retorna tal cual, NO como 2026-04-02T00:00:00.000Z
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false,
  // Configuracion del pool para evitar saturacion
  max: 10, // Maximo de conexiones en el pool
  idleTimeoutMillis: 30000, // Cerrar conexiones inactivas despues de 30s
  connectionTimeoutMillis: 5000 // Timeout para obtener conexion
});

// Manejar errores del pool
pool.on('error', (err) => {
  console.error('Error inesperado en el pool de conexiones:', err);
});

module.exports = pool;
