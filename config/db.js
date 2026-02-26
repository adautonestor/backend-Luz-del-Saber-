const { Pool } = require('pg');
require('dotenv').config();

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
