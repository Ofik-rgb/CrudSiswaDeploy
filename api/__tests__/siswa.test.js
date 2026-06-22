const request = require('supertest');
const app = require('../server');

describe('Pengujian Fitur Siswa (Integrasi API)', () => {
    let adminToken;
    let targetSiswaId;
    let dummyKelasId;

    beforeAll(async () => {
        // 1. Tunggu server & DB siap
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // 2. Login Admin
        const loginRes = await request(app)
            .post('/api/login')
            .send({ identifier: 'admin', password: 'password123' });
        
        adminToken = loginRes.body.token;

        // 3. Buat satu Kelas dummy agar tidak error Foreign Key saat tambah siswa
        const kelasRes = await request(app)
            .post('/api/kelas')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ nama_kelas: 'Kelas Uji Jest' });
        
        // Ambil ID kelas (jika kelas sudah ada, pastikan API mengembalikan ID-nya)
        dummyKelasId = kelasRes.body.data ? kelasRes.body.data.id : 1; 
    }, 10000);

    // 1. TEST CREATE SISWA
    it('Harus berhasil mendaftarkan Siswa baru', async () => {
        const res = await request(app)
            .post('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'Siswa Tester Jest',
                nisn: '20260001', // NISN unik
                role: 'siswa',
                password: 'password_siswa',
                id_kelas: dummyKelasId
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toBe("Pengguna berhasil didaftarkan!");
    });

    // 2. TEST VALIDASI NISN DUPLIKAT
    it('Harus gagal mendaftarkan Siswa dengan NISN yang sudah ada (400)', async () => {
        const res = await request(app)
            .post('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'Siswa Duplikat',
                nisn: '20260001', // Sama dengan NISN di atas
                role: 'siswa',
                password: 'password123',
                id_kelas: dummyKelasId
            });

        expect(res.statusCode).toEqual(400);
        expect(res.body.message).toContain("sudah terdaftar");
    });

    // 3. TEST READ SISWA
    it('Harus bisa menarik daftar pengguna dan menemukan siswa tadi', async () => {
        const res = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${adminToken}`);
        
        const siswaBaru = res.body.find(u => u.nisn === '20260001');
        targetSiswaId = siswaBaru.id;
        
        expect(res.statusCode).toEqual(200);
        expect(siswaBaru).toBeDefined();
        expect(siswaBaru.name).toBe('Siswa Tester Jest');
    });

    // 4. TEST DELETE SISWA
    it('Harus berhasil menghapus data Siswa', async () => {
        const res = await request(app)
            .delete(`/api/users/${targetSiswaId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toBe("Data berhasil dihapus selamanya.");
    });
});