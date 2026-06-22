// models/Guru.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Guru = sequelize.define('Guru', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  userId: { 
    type: DataTypes.INTEGER, 
    unique: 'idx_guru_userid' // 🎯 KUNCI: Nama indeks relasi dijamin statis
  },
  name: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  nip: { 
    type: DataTypes.STRING(18), 
    unique: 'idx_guru_nip', // 🎯 KUNCI: Menghentikan pembuatan otomatis nip_4, nip_5, dst.
    allowNull: true,
    validate: {
      isNumeric: {
        msg: "NIP hanya boleh diisi oleh karakter angka!"
      }
    }
  },
  jenis_kelamin: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  nuptk: { 
    type: DataTypes.STRING(16), 
    unique: 'idx_guru_nuptk', // 🎯 KUNCI: Menghentikan pembuatan otomatis nuptk_2, nuptk_3, dst.
    allowNull: true,
    validate: {
      isNumeric: {
        msg: "NUPTK hanya boleh berisi kombinasi angka murni!"
      },
      len: {
        args: [16, 16],
        msg: "Data NUPTK tidak valid, panjangnya wajib tepat 16 digit!"
      }
    }
  },
  pendidikan: { 
    type: DataTypes.STRING 
  },
  spesialisasi: { 
    type: DataTypes.STRING 
  },
  no_wa: { 
    type: DataTypes.STRING 
  },
  alamat: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  },
  foto: { 
    type: DataTypes.TEXT('long') 
  }
}, { 
  tableName: 'gurus', 
  timestamps: false 
});

module.exports = Guru;