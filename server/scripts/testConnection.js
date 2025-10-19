const { Client } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function testConnection() {
  const config = {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || "crm3_db",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
  };

  console.log("Тестирование подключения к PostgreSQL...");
  console.log("Конфигурация:", JSON.stringify({ ...config, password: "***" }, null, 2));

  const client = new Client(config);

  try {
    await client.connect();
    console.log(" Подключение успешно!");
    
    const result = await client.query("SELECT version()");
    console.log(" Версия PostgreSQL:", result.rows[0].version);
    
    await client.end();
  } catch (error) {
    console.error(" Ошибка подключения:", error.message);
    console.error("Код ошибки:", error.code);
    process.exit(1);
  }
}

testConnection();
