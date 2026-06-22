const { DataTypes } = require('sequelize');
const sequelize = require('../_config/database');

const Nilai = sequelize.define('Nilai', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_siswa: { type: DataTypes.INTEGER, allowNull: false },
  id_kelas: { type: DataTypes.INTEGER }, // Diambil dari bulk update
  id_mapel: { type: DataTypes.INTEGER, allowNull: false },
  
  semester: { 
    type: DataTypes.STRING,
    defaultValue: 'Ganjil' 
  },
  
  // Kolom dari API awal (POST /api/nilai)
  skor: { type: DataTypes.FLOAT },
  
  // Kolom dari API Spreadsheet (POST /api/nilai/bulk)
  nilai_harian: { type: DataTypes.FLOAT, defaultValue: 0 },
  nilai_uts: { type: DataTypes.FLOAT, defaultValue: 0 },
  nilai_uas: { type: DataTypes.FLOAT, defaultValue: 0 }
}, {
  tableName: 'nilai',
  timestamps: false,
 indexes: [
  {
    unique: true,
    fields: ['id_siswa', 'id_mapel', 'semester', 'id_kelas']  // ✅ tambahkan id_kelas
  }
]
});

module.exports = Nilai;