const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { User, Siswa, Guru, Nilai, Kelas, MataPelajaran, PenugasanGuru } = require('../_models');

router.post('/api/seeder/generate-dummy', async (req, res) => {
    try {
        console.log("🚀 Memulai injeksi data dummy presisi...");
        const passwordPlain = 'password123';
        const passwordHashed = await bcrypt.hash(passwordPlain, 10);

        const randomNilai = (min = 75, max = 95) => Math.floor(Math.random() * (max - min + 1)) + min;

        // ==========================================
        // 1. GENERATE KELAS & SIMPAN ID ASLI DATABASE
        // ==========================================
        const daftarKelasTemplate = [
            { nama: "Kelas 1A", level: 1 }, { nama: "Kelas 1B", level: 1 },
            { nama: "Kelas 2C", level: 2 }, { nama: "Kelas 3A", level: 3 },
            { nama: "Kelas 4A", level: 4 }, { nama: "Kelas 4B", level: 4 },
            { nama: "Kelas 5A", level: 5 }, { nama: "Kelas 6B", level: 6 }
        ];

        const masterKelas = [];
        for (const k of daftarKelasTemplate) {
            // Sesuaikan dengan nama kolom model Anda: nama_kelas atau nama
            const [kelasData] = await Kelas.findOrCreate({
                where: { nama_kelas: k.nama },
                defaults: { nama_kelas: k.nama }
            });
            // Ambil ID asli yang diberikan oleh MySQL
            masterKelas.push({ id: kelasData.id, nama: k.nama, level: k.level });
        }

        // ==========================================
        // 2. GENERATE MATA PELAJARAN
        // ==========================================
        const masterMapelTemplate = [
            { nama: "Matematika", kkm: 75 }, { nama: "Pendidikan Agama", kkm: 75 },
            { nama: "Pancasila", kkm: 75 }, { nama: "Bahasa Indonesia", kkm: 75 },
            { nama: "Ilmu Pengetahuan Alam", kkm: 75 }, { nama: "Ilmu Pengetahuan Sosial", kkm: 75 },
            { nama: "Seni Budaya", kkm: 75 }, { nama: "Pendidikan Jasmani Olahraga dan Kesehatan", kkm: 75 }
        ];

        for (const m of masterMapelTemplate) {
            await MataPelajaran.findOrCreate({
                where: { nama_mapel: m.nama },
                defaults: { nama_mapel: m.nama, kkm: m.kkm }
            });
        }
        const mapelFromDb = await MataPelajaran.findAll();
        const masterMapel = mapelFromDb.map(m => ({ id: m.id, nama: m.nama_mapel, kkm: m.kkm }));

        // ==========================================
        // 3. GENERATE GURU & WALI KELAS
        // ==========================================
        const namaGuruList = [
            "Drs. Hasanuddin, M.Pd.", "Sri Wahyuni, S.Pd.", "Andi Pratama, S.Pd.", "Nurul Hidayah, S.Pd.",
            "Bambang Sutrisno, S.Pd.", "Ratna Sari, M.Pd.", "Hendra Gunawan, S.Pd.", "Yuliana Putri, S.Pd."
        ];

        const daftarGuru = [];
        for (let g = 0; g < namaGuruList.length; g++) {
            const nipGuru = `1987062220100110${String(g + 1).padStart(2, '0')}`;
            const [userGuru] = await User.findOrCreate({
                where: { username: nipGuru },
                defaults: { username: nipGuru, password: passwordHashed, role: 'guru' }
            });

            const [profilGuru] = await Guru.findOrCreate({
                where: { userId: userGuru.id },
                defaults: {
                    userId: userGuru.id,
                    name: namaGuruList[g],
                    nip: nipGuru,
                    jenis_kelamin: g % 2 === 0 ? 'Laki-laki' : 'Perempuan',
                    no_wa: `0852333${String(3330 + g).padStart(4, '0')}`,
                    alamat: 'Makassar'
                }
            });
            daftarGuru.push(profilGuru);
        }

        // Set Wali Kelas
        for (let i = 0; i < masterKelas.length; i++) {
            if (daftarGuru[i]) {
                await Kelas.update({ id_wali_kelas: daftarGuru[i].id }, { where: { id: masterKelas[i].id } });
            }
        }

        // ==========================================
        // 4. GENERATE 30 SISWA + NILAI HISTORIS DIREKTUR MULTI-JENJANG
        // ==========================================
        const daftarNamaSiswa = [
            "Budi Santoso", "Siti Aminah", "Rian Hidayat", "Ahmad Fauzi", "Dewi Lestari", "Eko Prasetyo", "Fitriani", "Gilang Permana", "Hani Handayani", "Indra Wijaya",
            "Joko Susilo", "Kartika Sari", "Lukman Hakim", "Mega Utami", "Nanda Pratama", "Olivia Rizky", "Putra Perkasa", "Qori Aina", "Rizky Ramadhan", "Salsa Bella",
            "Taufik Hidayat", "Umi Kalsum", "Vina Amelia", "Wahyu Setiawan", "Xena Angel", "Yusuf Mansur", "Zahra Aulia", "Aris Munandar", "Bunga Citra", "Cahaya Putri"
        ];

        for (let i = 0; i < daftarNamaSiswa.length; i++) {
            const nisn = `00123456${String(i).padStart(2, '0')}`;
            const kelasTarget = masterKelas[i % masterKelas.length]; // Distribusi merata ke ID asli DB

            const [userSiswa] = await User.findOrCreate({
                where: { username: nisn },
                defaults: { username: nisn, password: passwordHashed, role: 'siswa' }
            });

            const [profilSiswa] = await Siswa.findOrCreate({
                where: { userId: userSiswa.id },
                defaults: {
                    userId: userSiswa.id,
                    name: daftarNamaSiswa[i],
                    nisn: nisn,
                    jenis_kelamin: i % 2 === 0 ? 'Laki-laki' : 'Perempuan',
                    id_kelas: kelasTarget.id,
                    status_siswa: 'Aktif'
                }
            });

            // Loop Nilai bersandar pada level ID kelas dinamis database
            for (let levelMasaLalu = 1; levelMasaLalu <= kelasTarget.level; levelMasaLalu++) {
                const kelasHistoris = masterKelas.find(k => k.level === levelMasaLalu);
                if (!kelasHistoris) continue;

                const tahunMulai = 2026 - (kelasTarget.level - levelMasaLalu);
                const ta = `${tahunMulai}/${tahunMulai + 1}`;

                for (let sem = 1; sem <= 2; sem++) {
                    for (const mapel of masterMapel) {
                        await Nilai.create({
                            id_siswa: profilSiswa.id, // ID asli dari tabel siswas
                            id_kelas: kelasHistoris.id, // ID asli dari tabel kelas
                            id_mapel: mapel.id,
                            semester: sem === 1 ? 'Ganjil' : 'Genap',
                            tahun_ajaran: ta,
                            nilai_harian: randomNilai(),
                            nilai_uts: randomNilai(),
                            nilai_uas: randomNilai(),
                            kkm: mapel.kkm
                        });
                    }
                }
            }
        }

        console.log("✅ Injeksi 30 Siswa dan Nilai Historis Sempurna.");
        res.status(200).json({ success: true, message: "Seeder Selesai!" });

    } catch (error) {
        console.error("❌ Seeder Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;