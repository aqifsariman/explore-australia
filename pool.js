import pg from 'pg';

const { Pool } = pg;

// set the way we will connect to the server
const pgConnectionConfigs = {
  user: 'aqifsariman',
  host: 'localhost',
  database: 'explore',
  port: 5432,
};

const pool = new Pool(pgConnectionConfigs);

export default pool;