import http from 'k6/http';
import { check, sleep } from 'k6';

// ========================================================
// 1. KONFIGURASI LOAD TEST (Beban Konstan 50 VUs)
// ========================================================
export const options = {
  vus: 50,          // Menjalankan 50 Pengguna Virtual sekaligus
  duration: '1m',   // Tahan beban rata secara konstan selama 1 menit penuh
  thresholds: {
    http_req_failed: ['rate<0.01'],   // Syarat lulus: Total error request wajib di bawah 1%
    http_req_duration: ['p(95)<500'], // Syarat lulus: 95% respon server harus di bawah 500ms
  },
};

// ========================================================
// 2. LOGIKA UTAMA PENGUJIAN (Dijalankan berulang oleh VUs)
// ========================================================
export default function () {
  const BASE_URL = 'http://localhost:5000/api';
  
  // Generator ID Mutlak Unik (Anti-Tabrakan Data)
  const uniqueId = `${__VU}-${Date.now()}-${__ITER}`;

  // --------------------------------------------------------
  // A. SKENARIO 1: LOGIN SEBAGAI ADMIN
  // --------------------------------------------------------
  const loginPayload = JSON.stringify({
    identifier: 'admin',
    password: 'password123', // Akun bawaan dari auto-seed server.js Anda
  });

  const jsonHeader = { headers: { 'Content-Type': 'application/json' } };
  const loginRes = http.post(`${BASE_URL}/login`, loginPayload, jsonHeader);

  const isLoginOk = check(loginRes, {
    'Admin Berhasil Login': (r) => r.status === 200,
  });

  // Jika login sukses, gunakan tokennya untuk melakukan aksi CRUD Admin
  if (isLoginOk) {
    const token = loginRes.json().token;
    const authHeaders = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, // Menyuntikkan Token JWT Admin ke Header
      },
    };

    // --------------------------------------------------------
    // B. SKENARIO 2: ADMIN MENAMBAHKAN GURU BARU
    // --------------------------------------------------------
    const guruPayload = JSON.stringify({
      name: `Guru Load ${uniqueId}`,
      username: `guru_${uniqueId}`,
      password: 'password_guru',
      role: 'guru',
      nip: `NIP-${uniqueId}`, 
      jenis_kelamin: 'Laki-laki',
      no_wa: '08123456789',
      mata_pelajaran: 'Teknik Informatika'
    });

    const guruRes = http.post(`${BASE_URL}/users`, guruPayload, authHeaders);
    
    if (guruRes.status !== 200) {
      console.log(`[FAIL GURU] Status: ${guruRes.status} | Pesan: ${guruRes.body}`);
    }

    check(guruRes, {
      'Admin Sukses Tambah Guru': (r) => r.status === 200,
    });

    // --------------------------------------------------------
    // C. SKENARIO 3: ADMIN MENAMBAHKAN SISWA BARU
    // --------------------------------------------------------
    const siswaPayload = JSON.stringify({
      name: `Siswa Load ${uniqueId}`,
      password: 'password_siswa',
      role: 'siswa',
      nisn: `NISN-${uniqueId}`, 
      jenis_kelamin: 'Perempuan',
      id_kelas: null 
    });

    const siswaRes = http.post(`${BASE_URL}/users`, siswaPayload, authHeaders);

    if (siswaRes.status !== 200) {
      console.log(`[FAIL SISWA] Status: ${siswaRes.status} | Pesan: ${siswaRes.body}`);
    }

    check(siswaRes, {
      'Admin Sukses Tambah Siswa': (r) => r.status === 200,
    });
  }

  // Beri jeda 1 detik di setiap akhir iterasi agar simulasi menyerupai user manusia asli
  sleep(1);
}