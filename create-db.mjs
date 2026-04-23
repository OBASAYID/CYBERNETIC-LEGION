import pkg from 'pg';
const { Pool } = pkg;

const mainPool = new Pool({
  user: 'cronet',
  host: 'localhost',
  port: 5432,
  database: 'postgres'
});

(async () => {
  try {
    await mainPool.query('CREATE DATABASE cyrus_ai');
    console.log('✓ Database cyrus_ai created');
    process.exit(0);
  } catch (err) {
    if (err.code === '42P04') {
      console.log('✓ Database cyrus_ai already exists');
      process.exit(0);
    }
    console.error('✗ Error:', err.message);
    process.exit(1);
  } finally {
    await mainPool.end();
  }
})();
