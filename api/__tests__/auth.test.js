const request = require('supertest');
const app = require('../server');

describe('Pengujian Fitur Autentikasi (Login)', () => {

    // Memberi jeda agar server.js selesai melakukan sinkronisasi database & seeding
    beforeAll(async () => {
        await new Promise((resolve) => setTimeout(resolve, 3000));
    }, 10000);

    // 1. Skenario: Login Berhasil
    it('Harus berhasil login dengan kredensial admin yang benar', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({
                identifier: 'admin',
                password: 'password123'
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body.user.username).toBe('admin');
        expect(res.body.message).toBe("Login Berhasil");
    });

    // 2. Skenario: Password Salah
    it('Harus menolak login jika password salah (401)', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({
                identifier: 'admin',
                password: 'salah_password'
            });

        expect(res.statusCode).toEqual(401);
        expect(res.body.message).toBe("Username/NISN/NIP atau Password salah!");
    });

    // 3. Skenario: User Tidak Ditemukan
    it('Harus menolak login jika username tidak terdaftar (401)', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({
                identifier: 'user_gaib',
                password: 'password123'
            });

        expect(res.statusCode).toEqual(401);
    });

    // 4. Skenario: Akses Fitur Terproteksi Tanpa Login
    it('Harus menolak akses ke data user jika tidak menyertakan Token (403)', async () => {
        const res = await request(app).get('/api/users');
        
        expect(res.statusCode).toEqual(403);
        expect(res.body.message).toBe("Akses ditolak! Token tidak ditemukan.");
    });
});