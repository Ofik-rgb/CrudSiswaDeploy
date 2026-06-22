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
    dialectModule: mysql2, // Paksa vercel membungkus mysql2
    
    // 💡 SOLUSI UTAMA: Batasi pool koneksi khusus untuk serverless
    pool: {
      max: 1,         // Maksimal 1 koneksi saja per instansi lambda Vercel
      min: 0,         // Jika tidak ada request, turunkan jadi 0 koneksi
      idle: 5000,     // Putus koneksi otomatis jika menganggur selama 5 detik
      acquire: 30000  // Waktu toleransi maksimal untuk jabat tangan ke database
    }
  }
);

module.exports = sequelize;