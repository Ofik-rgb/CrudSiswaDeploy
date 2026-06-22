const mysql2 = require('mysql2'); 
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,     
  process.env.DB_USER,     
  process.env.DB_PASSWORD, 
  {
    host: process.env.DB_HOST, 
    dialect: 'mysql',
    logging: false,
    dialectModule: mysql2, 
    
    // 💡 SOLUSI RADIKAL: Eviksi Kilat Khusus Database Berkuota Ketat (Max 5)
    pool: {
      max: 1,         // Mutlak 1 koneksi saja per instansi lambda Vercel
      min: 0,
      idle: 500,      // ⚡ POTONG KONEKSI DALAM 0.5 DETIK jika sedang menganggur
      evict: 500,     // ⚡ Bersihkan antrean mati setiap 0.5 detik tanpa ampun
      acquire: 15000  // Beri kelonggaran waktu tunggu antrean slot kosong
    },
    dialectOptions: {
      connectTimeout: 15000
    }
  }
);

module.exports = sequelize;