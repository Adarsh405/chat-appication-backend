const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.query("SELECT NOW()", (err, result) => {
  if (err) {
    console.error("❌ PostgreSQL connection failed:");
    console.error(err);
  } else {
    console.log("✅ PostgreSQL connected successfully");
    console.log("Database time:", result.rows[0].now);
  }
});

module.exports = pool;