import oracledb from 'oracledb';
import dotenv from 'dotenv';

dotenv.config();

// Oracle connection configuration
const dbConfig = {
  user: process.env.ORACLE_USER || 'shreyas',
  password: process.env.ORACLE_PASSWORD || '1234',
  connectString: process.env.ORACLE_CONNECT || 'localhost:1521/XEPDB1',
};

// Initialize connection pool
let pool;

export async function initializePool() {
  try {
    pool = await oracledb.createPool({
      ...dbConfig,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 1,
      waitTimeout: 60000,
    });
    console.log('✅ Oracle Connection Pool initialized successfully');
    return pool;
  } catch (error) {
    console.error('❌ Failed to create connection pool:', error.message);
    throw error;
  }
}

// Get connection from pool
export async function getConnection() {
  if (!pool) {
    await initializePool();
  }
  try {
    const connection = await pool.getConnection();
    return connection;
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    throw error;
  }
}

// Close pool
export async function closePool() {
  if (pool) {
    try {
      await pool.close();
      console.log('✅ Connection pool closed');
    } catch (error) {
      console.error('❌ Error closing pool:', error.message);
    }
  }
}

export default { initializePool, getConnection, closePool };
