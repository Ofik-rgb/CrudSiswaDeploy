// models/Siswa.js
const { DataTypes } = require('sequelize');
const sequelize = require('../_config/database');

const Siswa = sequelize.define('Siswa', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  userId: { 
    type: DataTypes.INTEGER, 
    unique: 'idx_siswa_userid' // 🎯 KUNCI: Mencegah duplikasi indeks pada relasi user-siswa
  },
  name: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  nisn: { 
    type: DataTypes.STRING(10), // NISN standar Kemendikbudristek terdiri dari 10 digit
    unique: 'idx_siswa_nisn', // 🎯 KUNCI: Menghentikan pembuatan otomatis nisn_2, nisn_3, dst.
    allowNull: true 
  },
  jenis_kelamin: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  id_kelas: { 
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status_siswa: { 
    type: DataTypes.ENUM('Aktif', 'Lulus', 'Keluar'), 
    defaultValue: 'Aktif' 
  },
  alamat: { 
    type: DataTypes.TEXT,
    allowNull: true
  },
  no_wa: { 
    type: DataTypes.STRING,
    allowNull: true
  },
  foto: { 
    type: DataTypes.TEXT('long'),
    allowNull: true
  }
}, { 
  tableName: 'siswas', 
  timestamps: false 
});

module.exports = Siswa;