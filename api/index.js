// ==========================================
// 1. IMPORT LIBRARIES & DEPENDENCIES (ES MODULE)
// ==========================================
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { Op } from 'sequelize';

// Import Konfigurasi Database & Seluruh Model Profil
import sequelize from './_config/database.js';


// 📄 GANTI DENGAN SINTAKS STAR IMPORT INI:
import * as models from './_models/index.js';

// Bongkar objeknya di bawahnya seperti biasa
const { User, Admin, Guru, Siswa, Kepsek, Kelas, MataPelajaran, PenugasanGuru, Nilai } = models;

// Import Router
import seederRouter from './_routes/seeder.js';

const app = express();

// ==========================================
// 2. GLOBAL SECURITY & PARSING MIDDLEWARE
// ==========================================
app.use(helmet());
app.use(helmet.hidePoweredBy());
app.use(helmet.xssFilter());
app.use(cors());

// Memperbesar batas JSON untuk kebutuhan upload/payload besar
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const SECRET_KEY = process.env.JWT_SECRET || "kunci_rahasia_siakad_super_aman";

// ==========================================
// 3. SINKRONISASI DATABASE & AUTO-SEEDING (VERSI SERVERLESS)
// ==========================================
let isDbConnected = false;

async function connectAndSeed() {
  if (isDbConnected) return;
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('Database tersinkronisasi sempurna dengan Sequelize ORM.');

    const adminExist = await User.findOne({ where: { username: 'admin' } });
    if (!adminExist) {
      const newAdmin = await User.create({
        username: 'admin',
        password: 'password123',
        role: 'admin'
      });
      await Admin.create({
        userId: newAdmin.id,
        name: 'Super Admin'
      });
      console.log('AUTO-SEED: Akun Admin berhasil dibuat.');
    }
    isDbConnected = true;
  } catch (err) {
    console.error('Gagal koneksi/sinkronisasi database:', err);
  }
}

// Jalankan koneksi setiap kali ada request masuk
app.use(async (req, res, next) => {
  await connectAndSeed();
  next();
});

// ==========================================
// 4. SECURITY MIDDLEWARE (RATE LIMIT & JWT)
// ==========================================
const verifyToken = (req, res, next) => {
  const bearerHeader = req.headers['authorization'];
  if (typeof bearerHeader !== 'undefined') {
    const token = bearerHeader.split(' ')[1];
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) return res.status(403).json({ message: "Sesi habis. Silakan login kembali." });
      req.user = decoded;
      next();
    });
  } else {
    res.status(403).json({ message: "Akses ditolak! Token tidak ditemukan." });
  }
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    message: "Terlalu banyak upaya login dari komputer ini. Silakan coba lagi setelah 15 menit."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==========================================
// 5. API ENDPOINTS & ROUTING
// ==========================================

// Terapkan rate-limiter khusus untuk Login API
app.use('/api/login', loginLimiter);

// API AUTENTIKASI (LOGIN)
app.post('/api/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const user = await User.findOne({
      include: [
        { model: Admin }, { model: Guru }, { model: Siswa }, { model: Kepsek }
      ],
      where: {
        password: password,
        [Op.or]: [
          { username: identifier },
          { '$Siswa.nisn$': identifier },
          { '$Guru.nip$': identifier },
          { '$Kepsek.nip$': identifier }
        ]
      }
    });

    if (user) {
      const userData = user.toJSON();
      let profil = {};
      if (userData.role === 'admin' && userData.Admin) profil = userData.Admin;
      if (userData.role === 'guru' && userData.Guru) profil = userData.Guru;
      if (userData.role === 'siswa' && userData.Siswa) profil = userData.Siswa;
      if (userData.role === 'kepsek' && userData.Kepsek) profil = userData.Kepsek;

      const finalUser = {
        ...profil,
        id: userData.id,
        username: userData.username,
        role: userData.role,
      };

      const token = jwt.sign({ id: finalUser.id, role: finalUser.role }, SECRET_KEY, { expiresIn: '8h' });
      res.json({ message: "Login Berhasil", token, user: finalUser });
    } else {
      res.status(401).json({ message: "Username/NISN/NIP atau Password salah!" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// API UNTUK STATISTIK DASHBOARD
// ==========================================
app.get('/api/dashboard/stats', verifyToken, async (req, res) => {
  try {
    const [admin, kepsek, guru, siswa] = await Promise.all([
      User.count({ where: { role: 'admin' } }),
      User.count({ where: { role: 'kepsek' } }),
      User.count({ where: { role: 'guru' } }),
      User.count({ where: { role: 'siswa' } })
    ]);
    res.json({ admin, kepsek, guru, siswa });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// API MASTER DATA PENGGUNA (CRUD)
// ==========================================

app.put('/api/users/profile/:id', verifyToken, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    let userId = req.user.id;
    const userRole = req.user.role;

    console.log(`📊 Request Update Masuk - ID Token: ${userId} | Role: ${userRole}`);

    const {
      name,
      username,
      password,
      no_wa,
      jenis_kelamin,
      tanggal_lahir,
      foto,
      alamat,
      spesialisasi,
      nuptk,
      nip,
      pendidikan
    } = req.body;

    // Validasi NIP khusus Kepsek & Guru
    if ((userRole === 'kepsek' || userRole === 'guru') && nip) {
      const nipRegex = /^[0-9]{18}$/;
      if (!nipRegex.test(String(nip).trim())) {
        await t.rollback();
        return res.status(400).json({ message: "Format NIP salah! NIP wajib berisi tepat 18 digit angka tanpa huruf atau simbol." });
      }
    }

    // Cek langsung ke tabel users utama
    let currentUser = await User.findByPk(userId, { transaction: t });

    // Logika deteksi pintar berdasarkan role
    if (!currentUser) {
      if (userRole === 'admin') {
        const dataAdmin = await Admin.findByPk(userId, { transaction: t });
        if (dataAdmin) userId = dataAdmin.userId;
      } else if (userRole === 'siswa') {
        const dataSiswa = await Siswa.findByPk(userId, { transaction: t });
        if (dataSiswa) userId = dataSiswa.userId;
      } else if (userRole === 'guru') {
        const dataGuru = await Guru.findByPk(userId, { transaction: t });
        if (dataGuru) userId = dataGuru.userId;
      } else if (userRole === 'kepsek') {
        console.log(`⚠️ ID ${userId} tidak ada di tabel users. Mencari di tabel kepseks...`);
        const dataKepsek =
          await Kepsek.findOne({ where: { id: userId }, transaction: t }) ||
          await Kepsek.findByPk(userId, { transaction: t });
        if (dataKepsek) userId = dataKepsek.userId;
      }

      currentUser = await User.findByPk(userId, { transaction: t });
    }

    if (!currentUser) {
      await t.rollback();
      return res.status(404).json({ message: "User profil benar-benar tidak ditemukan." });
    }

    console.log(`🎯 TARGET UPDATE DIKUNCI ➔ User ID: ${userId} (${currentUser.username})`);

    // Update data Akun Utama (Tabel users)
    const updateUserData = {};
    if (username && username.trim() !== currentUser.username) {
      updateUserData.username = username.trim();
    }
    if (password) {
      updateUserData.password = password;
    }

    // Update username dengan case-sensitive fix
    if (username && username.trim() !== currentUser.username && username.trim().toLowerCase() === currentUser.username.toLowerCase()) {
      await sequelize.query(
        'UPDATE users SET username = :username WHERE id = :id',
        { replacements: { username: username.trim(), id: userId }, transaction: t }
      );
    } else if (Object.keys(updateUserData).length > 0) {
      await User.update(updateUserData, { where: { id: userId }, transaction: t });
    }

    // Update data detail profil berdasarkan Role
    if (userRole === 'admin') {
      let profilAdmin = await Admin.findOne({ where: { userId: userId }, transaction: t });
      if (profilAdmin) {
        profilAdmin.name = name.trim();
        profilAdmin.no_wa = no_wa;
        profilAdmin.jenis_kelamin = jenis_kelamin;
        profilAdmin.tanggal_lahir = tanggal_lahir;
        profilAdmin.foto = foto;
        await profilAdmin.save({ transaction: t });
      } else {
        await Admin.create({
          userId: userId,
          name: name.trim(),
          no_wa: no_wa || null,
          jenis_kelamin: jenis_kelamin || 'Laki-laki',
          tanggal_lahir: tanggal_lahir || null,
          foto: foto || null
        }, { transaction: t });
      }

    } else if (userRole === 'guru') {
      let profilGuru = await Guru.findOne({ where: { userId: userId }, transaction: t });
      if (profilGuru) {
        if (name) profilGuru.name = name.trim();
        if (jenis_kelamin) profilGuru.jenis_kelamin = jenis_kelamin;
        if (no_wa !== undefined) profilGuru.no_wa = no_wa;
        if (tanggal_lahir !== undefined) profilGuru.tanggal_lahir = tanggal_lahir;
        if (foto !== undefined) profilGuru.foto = foto;
        if (alamat !== undefined) profilGuru.alamat = alamat;
        if (spesialisasi !== undefined) profilGuru.spesialisasi = spesialisasi;
        if (nuptk !== undefined) profilGuru.nuptk = nuptk;
        if (nip !== undefined) profilGuru.nip = String(nip).trim();
        if (pendidikan !== undefined) profilGuru.pendidikan = pendidikan;
        await profilGuru.save({ transaction: t });
      } else {
        await Guru.create({
          userId: userId,
          name: name.trim(),
          no_wa: no_wa || null,
          jenis_kelamin: jenis_kelamin,
          tanggal_lahir: tanggal_lahir || null,
          alamat: alamat || null,
          spesialisasi: spesialisasi || null,
          nuptk: nuptk || null,
          nip: nip ? String(nip).trim() : null,
          pendidikan: pendidikan || 'S1 Pendidikan',
          foto: foto || null
        }, { transaction: t });
      }

    } else if (userRole === 'siswa') {
      let profilSiswa = await Siswa.findOne({ where: { userId: userId }, transaction: t });
      if (profilSiswa) {
        if (name) profilSiswa.name = name.trim();
        if (jenis_kelamin) profilSiswa.jenis_kelamin = jenis_kelamin;
        if (no_wa !== undefined) profilSiswa.no_wa = no_wa;
        if (alamat !== undefined) profilSiswa.alamat = alamat;
        if (foto !== undefined) profilSiswa.foto = foto;
        await profilSiswa.save({ transaction: t });
      } else {
        await Siswa.create({
          userId: userId,
          name: name.trim(),
          jenis_kelamin: jenis_kelamin || 'Laki-laki',
          no_wa: no_wa || null,
          alamat: alamat || null,
          foto: foto || null
        }, { transaction: t });
      }

    } else if (userRole === 'kepsek') {
      let profilKepsek = await Kepsek.findOne({ where: { userId: userId }, transaction: t });
      if (profilKepsek) {
        if (name) profilKepsek.name = name.trim();
        if (no_wa !== undefined) profilKepsek.no_wa = no_wa;
        if (nip !== undefined) profilKepsek.nip = String(nip).trim();
        if (foto !== undefined) profilKepsek.foto = foto;
        if (alamat !== undefined) profilKepsek.alamat = alamat;
        await profilKepsek.save({ transaction: t });
        console.log(`💾 DATA PROFIL KEPSEK (${name}) BERHASIL DIKUNCI PERMANEN!`);
      } else {
        await Kepsek.create({
          userId: userId,
          name: name.trim(),
          nip: nip ? String(nip).trim() : null,
          no_wa: no_wa || null,
          foto: foto || null,
          alamat: alamat || null
        }, { transaction: t });
        console.log(`=== BARIS BARU TABEL KEPSEK BERHASIL DIBUAT ===`);
      }
    }

    await t.commit();

    const updatedKepsek = userRole === 'kepsek' ? await Kepsek.findOne({ where: { userId } }) : null;

    return res.json({
      message: "Profil Anda berhasil diperbarui!",
      user: updatedKepsek ? { ...updatedKepsek.toJSON(), username: currentUser.username, role: userRole } : null
    });

  } catch (error) {
    await t.rollback();
    console.error("❌ GAGAL UPDATE PROFIL MANDIRI:", error);
    return res.status(500).json({ message: "Terjadi kesalahan sistem pada server.", error: error.message });
  }
});

app.get('/api/users', verifyToken, async (req, res) => {
  const allowedRoles = ['admin', 'kepsek', 'guru'];
  if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ message: "Akses Ditolak!" });

  try {
    const users = await User.findAll({
      include: [
        { model: Admin },
        { model: Kepsek },
        { model: Guru },
        {
          model: Siswa,
          include: [{ model: Kelas, as: 'Kelas', attributes: ['nama_kelas'] }]
        }
      ],
      order: [['role', 'ASC']]
    });

    const formattedUsers = users.map(u => {
      const userData = u.get({ plain: true });
      let profilRaw = {};

      if (userData.role === 'admin') profilRaw = userData.Admin || {};
      if (userData.role === 'guru') profilRaw = userData.Guru || {};
      if (userData.role === 'kepsek') profilRaw = userData.Kepsek || {};
      if (userData.role === 'siswa') profilRaw = userData.Siswa || {};

      const profilBersih = { ...profilRaw };
      const idProfilAsli = profilBersih.id;
      delete profilBersih.id;

      return {
        ...profilBersih,
        id: userData.id,
        id_profil_internal: idProfilAsli,
        username: userData.username,
        role: userData.role,
        nama_kelas: (userData.role === 'siswa' && profilRaw.Kelas) ? profilRaw.Kelas.nama_kelas : null
      };
    });

    res.json(formattedUsers);
  } catch (error) {
    console.error("❌ ERROR API USERS:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint Tambah User Baru
app.post('/api/users',
  verifyToken,
  [
    body('password')
      .notEmpty().withMessage('Password wajib diisi')
      .isLength({ min: 3 }).withMessage('Password minimal harus 3 karakter'),
    body('role')
      .isIn(['admin', 'guru', 'siswa', 'kepsek']).withMessage('Role pengguna tidak terdaftar')
  ],
  async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Akses Ditolak!" });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: "fail",
        errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
      });
    }

    const t = await sequelize.transaction();

    try {
      const { name, username, password, role, nisn, nip, id_kelas, mata_pelajaran, jenis_kelamin, no_wa } = req.body;

      const finalUsername = (role === 'siswa') ? nisn : (username || nip);

      if (!finalUsername || finalUsername.trim() === "") {
        await t.rollback();
        return res.status(400).json({ message: "Username, NIP, atau NISN wajib diisi." });
      }

      const newUser = await User.create({
        username: finalUsername.trim(),
        password,
        role
      }, { transaction: t });

      if (role === 'admin') {
        await Admin.create({ userId: newUser.id, name }, { transaction: t });
      } else if (role === 'kepsek') {
        await Kepsek.create({
          userId: newUser.id,
          name,
          nip,
          jenis_kelamin: jenis_kelamin || "Laki-laki",
          no_wa: no_wa || "-"
        }, { transaction: t });
      } else if (role === 'guru') {
        await Guru.create({
          userId: newUser.id,
          name,
          nip,
          spesialisasi: mata_pelajaran || "Umum",
          jenis_kelamin: jenis_kelamin || "Laki-laki",
          no_wa: no_wa || "-"
        }, { transaction: t });
      } else if (role === 'siswa') {
        await Siswa.create({
          userId: newUser.id,
          name: name,
          nisn,
          jenis_kelamin: jenis_kelamin || "Laki-laki",
          id_kelas: (!id_kelas || id_kelas === "") ? null : id_kelas
        }, { transaction: t });
      }

      await t.commit();
      return res.status(201).json({ message: "Pengguna berhasil didaftarkan!" });
    } catch (error) {
      await t.rollback();
      console.error("❌ GAGAL MENDAFTARKAN USER BARU:", error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ message: "Data Unik (Username/NISN/NIP) sudah terdaftar." });
      }
      return res.status(500).json({ message: "Gagal menyimpan data ke database.", error: error.message });
    }
  }
);

// Edit Data User
app.put('/api/users/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Akses Ditolak!" });
  const t = await sequelize.transaction();

  try {
    const userId = req.params.id;
    const { name, nisn, jenis_kelamin, id_kelas, status_siswa, password } = req.body;

    const userTarget = await User.findByPk(userId);
    if (!userTarget) throw new Error("User tidak ditemukan.");

    if (password) await User.update({ password }, { where: { id: userId }, transaction: t });

    if (userTarget.role === 'siswa') {
      await Siswa.update(
        { name, nisn, jenis_kelamin, id_kelas: (!id_kelas || id_kelas === "") ? null : id_kelas, status_siswa },
        { where: { userId: userId }, transaction: t }
      );
    }

    await t.commit();
    res.json({ message: "Data berhasil diperbarui!" });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', verifyToken, async (req, res) => {
  try {
    const deleted = await User.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: "Data tidak ditemukan." });
    res.status(200).json({ message: "Data berhasil dihapus selamanya." });
  } catch (error) {
    res.status(500).json({ message: "Gagal menghapus data dari database.", detail: error.message });
  }
});

app.put('/api/admin/guru/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Akses Ditolak!" });
  const t = await sequelize.transaction();
  try {
    const { name, nip, jenis_kelamin, no_wa, password } = req.body;
    const userId = req.params.id;

    if (password) await User.update({ password }, { where: { id: userId }, transaction: t });
    await Guru.update({ name, nip, jenis_kelamin, no_wa }, { where: { userId: userId }, transaction: t });

    await t.commit();
    res.json({ message: "Data guru berhasil diperbarui!" });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// REKAM AKADEMIK: KHS AKTIF & RIWAYAT
// ==========================================

// KHS Aktif (hanya nilai di kelas saat ini)
app.get('/api/nilai/me', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'siswa') {
      return res.status(403).json({ message: "Akses Ditolak!" });
    }

    const profilSiswa = await Siswa.findOne({ where: { userId: req.user.id } });
    if (!profilSiswa) return res.json([]);

    const dataNilai = await Nilai.findAll({
      where: {
        id_siswa: profilSiswa.id,
        id_kelas: profilSiswa.id_kelas
      },
      include: [{ model: MataPelajaran, as: 'MataPelajaran' }]
    });

    const formattedNilai = dataNilai.map(n => {
      const plainNilai = n.get({ plain: true });
      return {
        semester: plainNilai.semester,
        nama_mapel: plainNilai.MataPelajaran?.nama_mapel || "Mata Pelajaran",
        kkm: plainNilai.MataPelajaran?.kkm || 75,
        nilai_harian: plainNilai.nilai_harian || 0,
        nilai_uts: plainNilai.nilai_uts || 0,
        nilai_uas: plainNilai.nilai_uas || 0
      };
    });

    return res.json(formattedNilai);
  } catch (error) {
    console.error("❌ ERROR KHS BACKEND:", error);
    return res.status(500).json({ message: "Terjadi kesalahan internal.", error: error.message });
  }
});

// Arsip Riwayat Nilai Siswa
app.get('/api/riwayatsiswa', verifyToken, async (req, res) => {
  try {
    const profilSiswa = await Siswa.findOne({ where: { userId: req.user.id } });
    if (!profilSiswa) return res.status(404).json({ message: "Siswa tidak ditemukan" });

    const semuaNilai = await Nilai.findAll({
      where: { id_siswa: profilSiswa.id },
      include: [
        { model: MataPelajaran, as: 'MataPelajaran' },
        { model: Kelas, as: 'Kelas' }
      ],
      order: [['id_kelas', 'ASC'], ['semester', 'ASC']]
    });

    const formatRiwayat = semuaNilai.map(n => {
      const d = n.toJSON();
      return {
        nama_kelas: d.Kelas?.nama_kelas || 'Kelas Terhapus',
        nama_mapel: d.MataPelajaran?.nama_mapel || '-',
        kkm: d.MataPelajaran?.kkm || 75,
        semester: d.semester,
        nilai_harian: d.nilai_harian || 0,
        nilai_uts: d.nilai_uts || 0,
        nilai_uas: d.nilai_uas || 0
      };
    });
    res.json(formatRiwayat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// API KELAS & PENUGASAN
// ==========================================
app.get('/api/kelas', verifyToken, async (req, res) => {
  try {
    const kelasData = await Kelas.findAll({
      include: [
        { model: Guru, as: 'WaliKelas', attributes: ['name', 'nip'] },
        { model: Siswa, as: 'DaftarSiswa' },
        {
          model: PenugasanGuru, as: 'Penugasan',
          include: [
            { model: Guru, as: 'Guru', attributes: ['name'] },
            { model: MataPelajaran, as: 'MataPelajaran', attributes: ['nama_mapel'] }
          ]
        }
      ]
    });
    res.json(kelasData);
  } catch (error) {
    console.error("❌ ERROR API KELAS:", error);
    res.status(500).json({ error: "Gagal mengambil data kelas." });
  }
});

app.post('/api/kelas', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Hanya Admin." });
  try {
    const { nama_kelas } = req.body;
    const existingKelas = await Kelas.findOne({ where: { nama_kelas } });
    if (existingKelas) return res.status(400).json({ message: "Nama kelas sudah terdaftar." });

    const newKelas = await Kelas.create({ nama_kelas });
    res.json({ message: "Kelas berhasil dibuat!", data: newKelas });
  } catch (error) {
    res.status(500).json({ message: "Terjadi kesalahan pada server saat membuat kelas." });
  }
});

app.put('/api/kelas/:id_kelas/penugasan', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Hanya Admin!" });
  const { id_kelas } = req.params;
  const { wali_kelas_id, penugasan_mapel } = req.body;
  const t = await sequelize.transaction();

  try {
    await Kelas.update({ id_wali_kelas: wali_kelas_id || null }, { where: { id: id_kelas }, transaction: t });
    await PenugasanGuru.destroy({ where: { id_kelas }, transaction: t });

    if (penugasan_mapel && penugasan_mapel.length > 0) {
      const dataToInsert = penugasan_mapel.map(p => ({ id_kelas, id_guru: p.id_guru, id_mapel: p.id_mapel }));
      await PenugasanGuru.bulkCreate(dataToInsert, { transaction: t });
    }

    await t.commit();
    res.json({ message: "Penugasan kelas berhasil diperbarui!" });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: "Terjadi kesalahan saat menyimpan penugasan." });
  }
});

app.delete('/api/kelas/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const jumlahSiswa = await Siswa.count({ where: { id_kelas: id } });
    if (jumlahSiswa > 0) {
      return res.status(400).json({
        message: `Gagal menghapus! Kelas ini masih memiliki ${jumlahSiswa} siswa aktif. Pindahkan siswa terlebih dahulu.`
      });
    }

    const kelas = await Kelas.findByPk(id, { include: ['WaliKelas'] });
    if (kelas && kelas.WaliKelas) {
      console.log(`💡 Info: Menghapus kelas yang diwalikan oleh ${kelas.WaliKelas.name}. Guru otomatis dibebastugaskan.`);
    }

    await Kelas.destroy({ where: { id } });
    return res.json({ message: "Kelas berhasil dihapus. Semua penugasan mengajar di kelas ini telah dibersihkan." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Terjadi kesalahan pada server." });
  }
});

// ==========================================
// API AKADEMIK & NILAI
// ==========================================

// Input Nilai Massal (Bulk)
app.post('/api/nilai/bulk', verifyToken, async (req, res) => {
  if (req.user.role !== 'guru' && req.user.role !== 'admin') return res.status(403).json({ message: "Akses ditolak." });
  const { id_kelas, id_mapel, semester, data_nilai } = req.body;

  try {
    const dataUntukDisimpan = data_nilai.map(item => ({
      id_siswa: item.id_siswa, id_kelas, id_mapel, semester,
      nilai_harian: item.nilai_harian || 0,
      nilai_uts: item.nilai_uts || 0,
      nilai_uas: item.nilai_uas || 0
    }));

    await Nilai.bulkCreate(dataUntukDisimpan, { updateOnDuplicate: ['nilai_harian', 'nilai_uts', 'nilai_uas'] });
    res.json({ message: "Seluruh nilai berhasil disimpan permanen!" });
  } catch (error) {
    res.status(500).json({ error: "Gagal menyimpan data nilai secara massal." });
  }
});

// Promosi Kelas & Kelulusan
app.put('/api/admin/promosi-kelas', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Akses ditolak!" });
  const { siswaIds, targetKelasId, statusBaru } = req.body;

  if (!siswaIds || !siswaIds.length) {
    return res.status(400).json({ message: "Pilih minimal 1 siswa." });
  }

  try {
    if (statusBaru === 'Lulus' || targetKelasId === null) {
      const [affectedRows] = await Siswa.update(
        { id_kelas: null, status_siswa: 'Lulus' },
        { where: { id: { [Op.in]: siswaIds } } }
      );
      return res.json({ message: `Selamat! ${affectedRows} siswa berhasil diluluskan menjadi Alumni.` });
    }

    if (!targetKelasId) return res.status(400).json({ message: "Tentukan kelas tujuan promosi." });

    const [affectedRows] = await Siswa.update(
      { id_kelas: targetKelasId, status_siswa: 'Aktif' },
      { where: { id: { [Op.in]: siswaIds } } }
    );
    res.json({ message: `Berhasil! ${affectedRows} siswa telah dipromosikan ke kelas baru.` });

  } catch (error) {
    console.error("❌ Error Kenaikan Kelas:", error);
    res.status(500).json({ error: "Gagal memproses kenaikan kelas di database." });
  }
});

// Nilai per Kelas & Mapel
app.get('/api/nilai/kelas/:id_kelas/mapel/:id_mapel', verifyToken, async (req, res) => {
  try {
    const { id_kelas, id_mapel } = req.params;
    const { semester } = req.query;

    const siswaDiKelas = await Siswa.findAll({ where: { id_kelas: id_kelas }, order: [['name', 'ASC']] });
    const daftarNilai = await Nilai.findAll({
      where: { id_kelas: id_kelas, id_mapel: id_mapel, semester: semester || 'Ganjil' }
    });

    const result = siswaDiKelas.map(s => {
      const n = daftarNilai.find(v => v.id_siswa === s.id);
      return {
        id_siswa: s.id,
        nama_siswa: s.name,
        nisn: s.nisn,
        jenis_kelamin: s.jenis_kelamin,
        nilai_harian: n ? n.nilai_harian : 0,
        nilai_uts: n ? n.nilai_uts : 0,
        nilai_uas: n ? n.nilai_uas : 0
      };
    });

    res.json(result);
  } catch (error) {
    console.error("❌ Error Fetch Nilai:", error);
    res.status(500).json({ error: error.message });
  }
});

// Rekap Nilai per Kelas (Admin)
app.get('/api/admin/rekap-kelas/:id_kelas', verifyToken, async (req, res) => {
  try {
    const id_kelas = req.params.id_kelas;

    const siswaData = await Siswa.findAll({
      where: { id_kelas: id_kelas, status_siswa: 'Aktif' },
      include: [{
        model: Nilai, as: 'DaftarNilai',
        include: [{ model: MataPelajaran, as: 'MataPelajaran' }]
      }]
    });

    const rekap = siswaData.map(s => {
      const siswa = s.toJSON();
      let totalNilai = 0;
      let mapelMerah = 0;
      const totalMapel = siswa.DaftarNilai ? siswa.DaftarNilai.length : 0;

      if (totalMapel > 0) {
        siswa.DaftarNilai.forEach(n => {
          const na = Math.round((n.nilai_harian * 0.2) + (n.nilai_uts * 0.3) + (n.nilai_uas * 0.5));
          totalNilai += na;
          const kkm = n.MataPelajaran?.kkm || 75;
          if (na < kkm) mapelMerah++;
        });
      }

      return {
        id: siswa.id,
        name: siswa.name,
        nisn: siswa.nisn,
        rata_rata: totalMapel > 0 ? (totalNilai / totalMapel).toFixed(1) : 0,
        total_mapel: totalMapel,
        mapel_merah: mapelMerah
      };
    });

    res.json(rekap);
  } catch (error) {
    console.error("❌ Error Rekap:", error);
    res.status(500).json({ error: error.message });
  }
});

// Detail Nilai Siswa (Admin View)
app.get('/api/admin/nilai-siswa/:id', verifyToken, async (req, res) => {
  try {
    const userIdDariFrontend = req.params.id;

    const profilSiswa = await Siswa.findOne({ where: { userId: userIdDariFrontend } });
    if (!profilSiswa) return res.json([]);

    const nilaiData = await Nilai.findAll({
      where: { id_siswa: profilSiswa.id },
      include: [
        { model: MataPelajaran, as: 'MataPelajaran' },
        { model: Kelas, as: 'Kelas' }
      ]
    });

    const formatNilai = nilaiData.map(n => {
      const data = n.toJSON();
      return {
        nama_mapel: data.MataPelajaran?.nama_mapel || 'Unknown',
        kkm: data.MataPelajaran?.kkm || 75,
        semester: data.semester,
        tahun_ajaran: data.tahun_ajaran || 'Tidak Diketahui',
        nama_kelas: data.Kelas?.nama_kelas || 'Riwayat Kelas',
        nilai_harian: data.nilai_harian,
        nilai_uts: data.nilai_uts,
        nilai_uas: data.nilai_uas
      };
    });

    res.json(formatNilai);
  } catch (error) {
    console.error("❌ Error Nilai Siswa:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// API MATA PELAJARAN
// ==========================================
app.get('/api/mapel', verifyToken, async (req, res) => {
  try { res.json(await MataPelajaran.findAll()); } catch (error) { res.status(500).json({ error: "Gagal." }); }
});

app.post('/api/mapel', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Ditolak!" });
  try {
    const newMapel = await MataPelajaran.create({ nama_mapel: req.body.nama_mapel, kkm: req.body.kkm || 75 });
    res.json({ message: "Ditambahkan!", data: newMapel });
  } catch (error) { res.status(500).json({ message: "Gagal menambahkan." }); }
});

app.put('/api/mapel/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Ditolak!" });
  try {
    await MataPelajaran.update({ nama_mapel: req.body.nama_mapel }, { where: { id: req.params.id } });
    res.json({ message: "Diperbarui!" });
  } catch (error) { res.status(500).json({ message: "Gagal memperbarui." }); }
});

app.delete('/api/mapel/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Ditolak!" });
  try {
    await MataPelajaran.destroy({ where: { id: req.params.id } });
    res.json({ message: "Dihapus." });
  } catch (error) { res.status(500).json({ message: "Gagal menghapus." }); }
});

// ==========================================
// API KHUSUS GURU
// ==========================================
app.get('/api/guru/my-classes', verifyToken, async (req, res) => {
  try {
    console.log("🔍 Menjalankan Kueri untuk User ID:", req.user.id);

    const profilGuru = await Guru.findOne({ where: { userId: req.user.id } });
    if (!profilGuru) {
      console.log("⚠️ Profil guru tidak ditemukan untuk User ID:", req.user.id);
      return res.json([]);
    }

    const penugasan = await PenugasanGuru.findAll({
      where: { id_guru: profilGuru.id },
      include: [{ model: Kelas, all: true }]
    });

    const kelasWali = await Kelas.findAll({
      where: { id_wali_kelas: profilGuru.id }
    });

    const mapKelas = new Map();

    kelasWali.forEach(k => mapKelas.set(k.id, { id_kelas: k.id, nama_kelas: k.nama_kelas }));

    for (const p of penugasan) {
      const dataPlain = p.get({ plain: true });
      const objekKelas = dataPlain.Kelas || dataPlain.kelas;

      if (objekKelas) {
        mapKelas.set(objekKelas.id, {
          id_kelas: objekKelas.id,
          nama_kelas: objekKelas.nama_kelas
        });
      } else {
        const kelasManual = await Kelas.findByPk(p.id_kelas);
        if (kelasManual) {
          mapKelas.set(kelasManual.id, { id_kelas: kelasManual.id, nama_kelas: kelasManual.nama_kelas });
        }
      }
    }

    const hasilAkhir = Array.from(mapKelas.values());
    console.log(`📊 Sukses! Mengirim data ${hasilAkhir.length} kelas untuk Guru ID: ${profilGuru.id}`);

    return res.json(hasilAkhir);

  } catch (error) {
    console.error("❌ ERROR API My Classes:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ==========================================
// SEEDING DATA DUMMY
// ==========================================
app.post('/api/seeding-siswa', async (req, res) => {
  try {
    const dataDummy = [
      { username: "4829103847", name: "Muhammad Fajar", nisn: "4829103847", jenis_kelamin: "Laki-laki" },
      { username: "7104928374", name: "Ahmad Rifai", nisn: "7104928374", jenis_kelamin: "Laki-laki" },
      { username: "1938475620", name: "Siti Nurhaliza", nisn: "1938475620", jenis_kelamin: "Perempuan" },
      { username: "8392014756", name: "Rizky Pratama", nisn: "8392014756", jenis_kelamin: "Laki-laki" },
      { username: "2049381756", name: "Dinda Lestari", nisn: "2049381756", jenis_kelamin: "Perempuan" }
    ];

    for (const siswa of dataDummy) {
      const newUser = await User.create({
        username: siswa.username,
        name: siswa.name,
        role: 'siswa',
        password: 'password123'
      });

      await Siswa.create({
        userId: newUser.id,
        name: siswa.name,
        nisn: siswa.nisn,
        jenis_kelamin: siswa.jenis_kelamin,
        status_siswa: 'Aktif',
        id_kelas: 3
      });
    }

    res.status(201).json({ message: "5 Data dummy langsung masuk Kelas X!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ROUTER SEEDER & START SERVER
// ==========================================
app.use(seederRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server SIAKAD ORM siap di http://localhost:${PORT}`);
});

export default app;