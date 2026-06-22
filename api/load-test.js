import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 25 },
    { duration: '30s', target: 50 }, 
    { duration: '2m', target: 50 }, 
    { duration: '30s', target: 0 },  
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],  
    http_req_duration: ['p(95)<500'], 
  },
};

export default function () {
  const BASE_URL = 'http://localhost:5000/api';
  const uniqueId = `${__VU}-${Date.now()}-${__ITER}`;


  // 1. SKENARIO: LOGIN SEBAGAI ADMIN
  const loginPayload = JSON.stringify({
    identifier: 'admin',
    password: 'password123', 
  });

  const jsonHeader = { headers: { 'Content-Type': 'application/json' } };
  const loginRes = http.post(`${BASE_URL}/login`, loginPayload, jsonHeader);

  const isLoginOk = check(loginRes, {
    'Admin Berhasil Login': (r) => r.status === 200,
  });

  if (isLoginOk) {
    const token = loginRes.json().token;
    const authHeaders = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, 
      },
    };

    // 2. SKENARIO: ADMIN MENAMBAHKAN GURU BARU
    const guruPayload = JSON.stringify({
      name: `Guru Test ${uniqueId}`,
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

    // 3. SKENARIO: ADMIN MENAMBAHKAN SISWA BARU
    const siswaPayload = JSON.stringify({
      name: `Siswa Uji ${uniqueId}`,
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

 
  sleep(1);
}