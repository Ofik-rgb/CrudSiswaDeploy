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
    dialectModule: mysql2, // Memaksa bundler Vercel membawa modul mysql2
    
    // 💡 OPTIMASI POOL TERBAIK UNTUK SERVERLESS CLOUD GRATISAN
    pool: {
      max: 2,         // Naikkan ke 2 agar instansi serverless tidak mengunci dirinya sendiri
      min: 0,
      idle: 1000,     // Langsung putus koneksi dalam 1 detik jika sudah tidak ada aktivitas
      acquire: 8000   // Menyerah dalam 8 detik (wajib di bawah limit 10 detik Vercel Hobby!)
    },
    dialectOptions: {
      connectTimeout: 8000 // Batasi waktu jabat tangan jaringan awal maksimal 8 detik
    }
  }
);

module.exports = sequelize;