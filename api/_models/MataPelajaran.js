const { DataTypes } = require('sequelize');
const sequelize = require('../_config/database');

const MataPelajaran = sequelize.define('MataPelajaran', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nama_mapel: {
    type: DataTypes.STRING,
    allowNull: false
  },
  kkm: {
    type: DataTypes.INTEGER,
    defaultValue: 75 // Default KKM yang digunakan di server.js
  }
}, {
  tableName: 'mata_pelajaran',
  timestamps: false
});

module.exports = MataPelajaran;