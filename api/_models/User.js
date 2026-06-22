// models/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../_config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: 'idx_user_username' // 🎯 KUNCI UTAMA: Menghentikan duplikasi indeks sampah username_2, username_3, dst.
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'guru', 'siswa', 'kepsek'),
    allowNull: false
  }
}, {
  tableName: 'users',
  timestamps: false
});

module.exports = User;