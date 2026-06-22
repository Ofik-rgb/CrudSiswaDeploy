const request = require('supertest');
const app = require('../server'); 

describe('Skenario Pengujian CRUD Guru (Integrasi API)', () => {
    let adminToken;
    let targetUserId;

    // A. SEBELUM TEST: Login sebagai admin untuk mendapatkan Token JWT
    beforeAll(async () => {
        // 1. Beri waktu 3 detik agar server.js selesai sync & seeding admin
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // 2. Coba login
        const response = await request(app)
            .post('/api/login')
            .send({
                identifier: 'admin',
                password: 'password123'
            });
        
        // 3. Pastikan login berhasil sebelum lanjut
        if (response.statusCode !== 200) {
            console.error("❌ LOGIN GAGAL:", response.body.message);
            throw new Error("Gagal mendapatkan token. Pastikan seeding admin di server.js sudah selesai.");
        }

        adminToken = response.body.token;
    }, 10000);

   // 1. TEST CREATE (Tambah Guru) - PERBAIKAN
    it('Harus berhasil mendaftarkan Guru baru (CREATE)', async () => {
        const res = await request(app)
            .post('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'Dosen Penguji Jest',
                username: 'guru_tester_jest', 
                nip: '999888777',
                role: 'guru',
                password: 'password_guru_baru',
                mata_pelajaran: 'Rekayasa Perangkat Lunak'
            });
        
        
        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toBe("Pengguna berhasil didaftarkan!");
    });
    // 2. TEST READ (Ambil Data Guru)
    it('Harus bisa menarik daftar pengguna dan menemukan guru tadi (READ)', async () => {
        const res = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(res.statusCode).toEqual(200);
        
        // Cari ID guru yang baru saja kita buat untuk dipakai di test EDIT/DELETE
        const guruBaru = res.body.find(u => u.nip === '999888777');
        targetUserId = guruBaru.id;
        
        expect(guruBaru).toBeDefined();
        expect(guruBaru.name).toBe('Dosen Penguji Jest');
    });

    // 3. TEST UPDATE (Edit Profil Guru)
    it('Harus berhasil memperbarui nama Guru (UPDATE)', async () => {
        const res = await request(app)
            .put(`/api/admin/guru/${targetUserId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'Dosen Penguji Jest (Update)',
                nip: '999888777',
                no_wa: '08999999999'
            });
        
        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toBe("Data guru berhasil diperbarui!");
    });

    // 4. TEST DELETE (Hapus Guru)
    it('Harus berhasil menghapus data Guru secara permanen (DELETE)', async () => {
        const res = await request(app)
            .delete(`/api/users/${targetUserId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toBe("Data berhasil dihapus selamanya.");
    });
});