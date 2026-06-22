// 1. Paksa Vercel Bundler untuk melihat dan mengemas modul mysql2
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
    // 2. KRUSIAL: Berikan modul mysql2 secara langsung ke Sequelize
    // Ini memotong jalur dynamic require bawaan Sequelize yang eror di Vercel
    dialectModule: mysql2 
  }
);

module.exports = sequelize;