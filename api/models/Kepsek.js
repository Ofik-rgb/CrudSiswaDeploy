// models/Kepsek.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Kepsek = sequelize.define('Kepsek', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  userId: { 
    type: DataTypes.INTEGER, 
    unique: 'idx_kepsek_userid' // 🎯 KUNCI: Mencegah duplikasi indeks pada relasi User-Kepsek
  },
  name: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  nip: { 
    type: DataTypes.STRING, 
    unique: 'idx_kepsek_nip', // 🎯 KUNCI: Menghentikan pembuatan otomatis nip_2, nip_3, dst.
    allowNull: true 
  },
  no_wa: { 
    type: DataTypes.STRING,
    allowNull: true
  },
  foto: { 
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  // 🎯 FIX: Tambahkan kolom alamat di sini agar Sequelize mengizinkan data masuk ke MySQL
  alamat: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, { 
  tableName: 'kepseks', 
  timestamps: false 
});

module.exports = Kepsek;