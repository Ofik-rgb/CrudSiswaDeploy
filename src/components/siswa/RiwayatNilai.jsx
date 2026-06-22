import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { History, Award, AlertCircle, BookmarkCheck } from 'lucide-react';

const RiwayatNilai = () => {
    const [riwayatData, setRiwayatData] = useState([]);
    const [kelasTersedia, setKelasTersedia] = useState([]);
    const [kelasTerpilih, setKelasTerpilih] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const token = localStorage.getItem('token');

   useEffect(() => {
        const fetchRiwayat = async () => {
            try {
                // 🎯 SINKRONKAN: Gunakan riwayat-siswa (sesuai yang terdaftar di backend)
               // Di dalam RiwayatNilai.jsx
const res = await axios.get('http://localhost:5000/api/riwayatsiswa', {
    headers: { Authorization: `Bearer ${token}` }
});
                setRiwayatData(res.data);

                const listKelasUnik = [...new Set(res.data.map(item => item.nama_kelas))]
                    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
                
                setKelasTersedia(listKelasUnik);
                if (listKelasUnik.length > 0) setKelasTerpilih(listKelasUnik[0]);
            } catch (error) {
                console.error("Gagal memuat histori nilai siswa");
            } finally {
                setIsLoading(false);
            }
        };
        fetchRiwayat();
    }, [token]);
    
    // Filter data berdasarkan kelas yang dipilih admin/siswa di dropdown
    const dataFilterKelas = riwayatData.filter(item => item.nama_kelas === kelasTerpilih);
    const nilaiGanjil = dataFilterKelas.filter(item => item.semester === 'Ganjil');
    const nilaiGenap = dataFilterKelas.filter(item => item.semester === 'Genap');

    // Fungsi menghitung rata-rata nilai akhir
    const hitungNilaiAkhir = (item) => Math.round(((item.nilai_harian||0)*0.2) + ((item.nilai_uts||0)*0.3) + ((item.nilai_uas||0)*0.5));

    if (isLoading) {
        return (
            <div className="text-center py-20 font-semibold text-gray-500">
                Memuat dokumen riwayat rekam akademik...
            </div>
        );
    }

    return (
        <div className="max-w-[90rem] mx-auto p-6 mt-4 animate-fade-in-up font-sans">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                        <History size={32} className="text-blue-700" /> Arsip Riwayat Akademik
                    </h1>
                    <p className="text-gray-500 mt-1">Lihat dan tinjau kembali data nilai rapor Anda pada tingkatan jenjang kelas sebelumnya.</p>
                </div>
                
                {/* Dropdown Pemilih Arsip Kelas */}
                <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border flex items-center gap-3 w-full md:w-auto">
                    <span className="text-sm font-bold text-gray-500 whitespace-nowrap">Pilih Arsip Tingkat:</span>
                    <select 
                        value={kelasTerpilih} // 🎯 FIXED: Tidak lagi kelasTerpilled
                        onChange={(e) => setKelasTerpilih(e.target.value)} 
                        className="p-2 border rounded-xl outline-none font-bold bg-blue-50 text-blue-900 border-blue-200 text-sm cursor-pointer"
                    >
                        {kelasTersedia.map(kName => <option key={kName} value={kName}>{kName}</option>)}
                    </select>
                </div>
            </div>

            {riwayatData.length === 0 ? (
                <div className="text-center bg-white p-16 rounded-3xl border border-dashed text-gray-400">
                    <Award size={64} className="mx-auto mb-4 text-gray-300" />
                    <p className="font-bold text-lg">Belum Ada Riwayat Kelas</p>
                    <p className="text-sm text-gray-400 mt-1">Riwayat nilai otomatis diarsipkan setelah Anda menyelesaikan dan melewati proses kenaikan kelas oleh Admin.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* NOTIFIKASI ARSIP */}
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl flex items-center gap-3">
                        <BookmarkCheck size={24} className="text-amber-600 shrink-0" />
                        <p className="text-sm font-semibold">
                            Menampilkan arsip laporan nilai digital resmi sewaktu Anda menduduki <span className="font-black underline">{kelasTerpilih}</span>.
                        </p>
                    </div>

                    {/* BLOK SEMESTER GANJIL */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="bg-blue-50/50 p-4 border-b font-bold text-blue-900">Arsip Transkrip - Semester Ganjil</div>
                        {renderTable(nilaiGanjil)}
                    </div>

                    {/* BLOK SEMESTER GENAP */}
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="bg-indigo-50/50 p-4 border-b font-bold text-indigo-900">Arsip Transkrip - Semester Genap</div>
                        {renderTable(nilaiGenap)}
                    </div>
                </div>
            )}
        </div>
    );

    // Fungsi pembantu render tabel agar kode bersih
    function renderTable(dataSemester) {
        if (dataSemester.length === 0) {
            return <p className="text-center p-6 text-gray-400 text-sm">Tidak terdapat entri catatan nilai di semester ini.</p>;
        }
        return (
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-gray-50 border-b text-gray-500 font-bold uppercase tracking-wider">
                            <th className="px-6 py-3">Mata Pelajaran</th>
                            <th className="px-6 py-3 text-center">KKM</th>
                            <th className="px-6 py-3 text-center">Harian</th>
                            <th className="px-6 py-3 text-center">UTS</th>
                            <th className="px-6 py-3 text-center">UAS</th>
                            <th className="px-6 py-3 text-center">Nilai Akhir</th>
                            <th className="px-6 py-3 text-center">Kelulusan</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                        {dataSemester.map((item, index) => {
                            const na = hitungNilaiAkhir(item);
                            const isTuntas = na >= item.kkm;
                            return (
                                <tr key={index} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4 font-bold text-gray-900">{item.nama_mapel}</td>
                                    <td className="px-6 py-4 text-center font-mono text-gray-400">{item.kkm}</td>
                                    <td className="px-6 py-4 text-center">{item.nilai_harian}</td>
                                    <td className="px-6 py-4 text-center">{item.nilai_uts}</td>
                                    <td className="px-6 py-4 text-center">{item.nilai_uas}</td>
                                    <td className={`px-6 py-4 text-center font-black text-base ${isTuntas ? 'text-green-600' : 'text-red-600'}`}>{na}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${isTuntas ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {isTuntas ? 'TUNTAS' : 'REMEDIAL'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }
};

export default RiwayatNilai;