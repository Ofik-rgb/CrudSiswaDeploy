import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, RefreshCw, Eye, X, BookOpen, AlertCircle, Calendar, ChevronDown, ChevronUp, GraduationCap } from 'lucide-react';

const ViewData = ({ roleTitle, roleType }) => {
    const [dataList, setDataList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // State untuk Modal Transkrip (Eksklusif Siswa)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeSiswa, setActiveSiswa] = useState(null);
    const [detailNilai, setDetailNilai] = useState([]);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    // State untuk menyimpan kunci kelas yang sedang dibuka di dropdown modal
    const [openDropdownKey, setOpenDropdownKey] = useState(null);

    const token = localStorage.getItem('token');

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('http://localhost:5000/api/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDataList(res.data.filter(u => u.role === roleType));
        } catch (error) {
            console.error("Gagal menarik data");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [roleType]);

    const openDetailModal = async (siswa) => {
        setActiveSiswa(siswa);
        setIsModalOpen(true);
        setIsLoadingDetail(true);
        setDetailNilai([]); 
        setOpenDropdownKey(null); // Reset dropdown agar tertutup semua saat ganti siswa
        
        try {
            const res = await axios.get(`http://localhost:5000/api/admin/nilai-siswa/${siswa.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data && Array.isArray(res.data)) {
                setDetailNilai(res.data);
                
                // Otomatis buka dropdown pertama jika data tersedia
                const kelompok = dapatkanKelompokAkademik(res.data);
                const keys = Object.keys(kelompok).sort().reverse();
                if (keys.length > 0) {
                    setOpenDropdownKey(keys[0]);
                }
            }
        } catch (error) {
            console.error("Gagal menarik detail nilai");
        } finally {
            setIsLoadingDetail(false);
        }
    };

    const filteredData = dataList.filter(d => 
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (d.username && d.username.includes(searchTerm)) ||
        (d.nisn && d.nisn.includes(searchTerm))
    );

    // 🎯 URUTAN DATA: Mengurutkan dari jenjang Kelas 1 ke Kelas 6 (Khusus Siswa)
    const sortedData = [...filteredData].sort((a, b) => {
        if (roleType !== 'siswa') return 0; // Jika bukan siswa, gunakan urutan default backend
        
        const kelasA = a.Siswa?.Kelas?.nama_kelas || a.nama_kelas || "";
        const kelasB = b.Siswa?.Kelas?.nama_kelas || b.nama_kelas || "";
        
        const angkaA = parseInt(kelasA.replace(/^\D+/g, '')) || 0;
        const angkaB = parseInt(kelasB.replace(/^\D+/g, '')) || 0;
        
        return angkaA - angkaB; 
    });

    const hitungRerata = (data) => {
        if (!data || data.length === 0) return 0;
        const total = data.reduce((acc, item) => {
            const na = Math.round(((item.nilai_harian||0)*0.2) + ((item.nilai_uts||0)*0.3) + ((item.nilai_uas||0)*0.5));
            return acc + na;
        }, 0);
        return (total / data.length).toFixed(1);
    };

    // Mengelompokkan Nilai Berdasarkan Jenjang Kelas + Semester (Eksklusif Siswa)
    const dapatkanKelompokAkademik = (dataKustom = detailNilai) => {
        const kelompok = {};
        dataKustom.forEach(item => {
            const kelasReguler = item.nama_kelas || "Riwayat Kelas";
            const sem = item.semester || "Ganjil";
            const key = `${kelasReguler} - Semester ${sem}`;
            
            if (!kelompok[key]) {
                kelompok[key] = [];
            }
            kelompok[key].push(item);
        });
        return kelompok;
    };

    const kelompokAkademik = dapatkanKelompokAkademik();

    const toggleDropdown = (key) => {
        if (openDropdownKey === key) {
            setOpenDropdownKey(null); // Tutup jika diklik kembali
        } else {
            setOpenDropdownKey(key); // Buka yang diklik
        }
    };

    return (
        <div className="max-w-[90rem] mx-auto p-6 mt-4 animate-fade-in-up">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                        {roleType === 'siswa' && <GraduationCap size={32} className="text-green-600" />}
                        Direktori {roleTitle}
                    </h1>
                    <p className="text-gray-500 mt-1">Data resmi seluruh {roleTitle.toLowerCase()} sekolah.</p>
                </div>
                <button onClick={fetchData} className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm">
                    <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Tabel Utama Direktori */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b bg-gray-50/50 flex justify-between items-center">
                    <div className="relative w-full md:w-96">
                        <Search size={18} className="absolute inset-y-0 left-4 top-3 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder={`Cari nama atau identitas...`} 
                            className="w-full pl-11 pr-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" 
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-widest border-b">
                                <th className="px-6 py-4">Informasi {roleTitle}</th>
                                
                                {/* Kolom kelas/wali disembunyikan untuk Admin */}
                                {roleType !== 'admin' && (
                                    <th className="px-6 py-4">
                                        {roleType === 'siswa' ? 'Kelas Sekarang' : 'Status Wali'}
                                    </th>
                                )}
                                
                                <th className="px-6 py-4">{roleType === 'siswa' ? 'NISN' : 'ID / Identitas'}</th>
                                <th className="px-6 py-4">Kontak</th>
                                
                                {/* 🎯 FIX: Header kolom Aksi hanya muncul untuk siswa */}
                                {roleType === 'siswa' && <th className="px-6 py-4 text-center">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                /* 🎯 FIX: colSpan dinamis berdasarkan role agar tidak merusak tata letak border layout */
                                <tr><td colSpan={roleType === 'siswa' ? "5" : roleType === 'admin' ? "3" : "4"} className="text-center py-20 font-medium text-gray-400">Menyinkronkan data...</td></tr>
                            ) : sortedData.length === 0 ? (
                                <tr><td colSpan={roleType === 'siswa' ? "5" : roleType === 'admin' ? "3" : "4"} className="text-center py-10 text-gray-400">Tidak ada data ditemukan.</td></tr>
                            ) : (
                                sortedData.map(d => (
                                    <tr key={d.id} className="hover:bg-blue-50/20 transition">
                                        {/* Nama Anggota */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-gray-900">{d.name}</span>
                                            </div>
                                        </td>
                                        
                                        {/* Konten Badge Status / Kelas (Admin otomatis dilewati) */}
                                        {roleType !== 'admin' && (
                                            <td className="px-6 py-4">
                                                {roleType === 'siswa' ? (
                                                    <span className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
                                                        {d.Siswa?.Kelas?.nama_kelas || d.nama_kelas || 'Belum Diplot'}
                                                    </span>
                                                ) : (
                                                    (() => {
                                                        const kelasWali = d.Guru?.WaliKelas?.nama_kelas || d.nama_kelas_wali || d.nama_kelas;
                                                        return kelasWali ? (
                                                            <span className="px-3 py-1.5 text-xs font-bold bg-green-50 text-green-700 rounded-lg border border-green-100">
                                                                Wali {kelasWali}
                                                            </span>
                                                        ) : (
                                                            <span className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-500 rounded-lg border border-gray-100">
                                                                Pengajar
                                                            </span>
                                                        );
                                                    })()
                                                )}
                                            </td>
                                        )}

                                        {/* Identitas / NISN */}
                                        <td className="px-6 py-4">
                                            <p className="font-mono text-gray-700 font-semibold">{d.nisn || d.username}</p>
                                        </td>
                                        
                                        {/* Kontak WA */}
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-600 font-medium">{d.no_wa || '-'}</span>
                                        </td>

                                        {/* 🎯 FIX: Tombol aksi transkrip dieliminasi untuk Admin & Guru */}
                                        {roleType === 'siswa' && (
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => openDetailModal(d)}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition shadow-sm"
                                                >
                                                    Lihat Transkrip
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL ACCORDION DROP-DOWN (Aman terlindungi dengan filter roleType) */}
            {isModalOpen && activeSiswa && roleType === 'siswa' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        {/* Header Modal */}
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                                    <BookOpen size={24} className="text-blue-600"/> Laporan Rekam Jejak Nilai Berkala
                                </h3>
                                <p className="text-sm font-bold text-gray-500 mt-1">{activeSiswa.name} ({activeSiswa.nisn || activeSiswa.username})</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-200 text-gray-600 rounded-full hover:bg-red-500 hover:text-white transition">
                                <X size={20} />
                            </button>
                        </div>
                        
                        {/* Body Modal dengan Sistem Accordion */}
                        <div className="p-6 overflow-y-auto space-y-3 bg-gray-50/30">
                            {isLoadingDetail ? (
                                <p className="text-center py-10 font-medium text-gray-500">Menganalisis rekam jejak nilai...</p>
                            ) : detailNilai.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-2xl border">
                                    <AlertCircle size={48} className="mx-auto text-gray-300 mb-3" />
                                    <p className="text-gray-500 italic">Belum ada catatan nilai untuk siswa ini di sistem.</p>
                                </div>
                            ) : (
                                Object.keys(kelompokAkademik).sort().reverse().map((labelPeriode) => {
                                    const nilaiKategori = kelompokAkademik[labelPeriode];
                                    const isDropdownOpen = openDropdownKey === labelPeriode;
                                    
                                    return (
                                        <div key={labelPeriode} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all">
                                            {/* Tombol Header Dropdown Kelas */}
                                            <button 
                                                onClick={() => toggleDropdown(labelPeriode)}
                                                className={`w-full flex items-center justify-between p-5 text-left font-extrabold text-sm transition ${isDropdownOpen ? 'bg-blue-50/40 text-blue-900' : 'hover:bg-gray-50 text-gray-800'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Calendar size={18} className="text-blue-600" />
                                                    <span>{labelPeriode}</span>
                                                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-mono">
                                                        Rerata Rapor: {hitungRerata(nilaiKategori)}
                                                    </span>
                                                </div>
                                                <div>
                                                    {isDropdownOpen ? <ChevronUp size={20} className="text-blue-600" /> : <ChevronDown size={20} className="text-gray-400" />}
                                                </div>
                                            </button>

                                            {/* Konten Nilai Rapor di dalam Dropdown */}
                                            {isDropdownOpen && (
                                                <div className="p-4 border-t border-gray-100 bg-white animate-fade-in">
                                                    <table className="w-full text-left border border-gray-100 rounded-xl overflow-hidden">
                                                        <thead>
                                                            <tr className="bg-gray-50 text-gray-500 text-[10px] font-bold uppercase tracking-wider border-b">
                                                                <th className="px-4 py-2.5">Mata Pelajaran</th>
                                                                <th className="px-4 py-2.5 text-center">Harian</th>
                                                                <th className="px-4 py-2.5 text-center">UTS</th>
                                                                <th className="px-4 py-2.5 text-center">UAS</th>
                                                                <th className="px-4 py-2.5 text-center bg-blue-50/50 w-28">Nilai Akhir</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100 text-sm">
                                                            {nilaiKategori.map((item, index) => {
                                                                const na = Math.round(((item.nilai_harian||0)*0.2) + ((item.nilai_uts||0)*0.3) + ((item.nilai_uas||0)*0.5));
                                                                const isTuntas = na >= (item.kkm || 75);
                                                                return (
                                                                    <tr key={index} className="hover:bg-gray-50/50">
                                                                        <td className="px-4 py-2.5 font-bold text-gray-800">{item.nama_mapel}</td>
                                                                        <td className="px-4 py-2.5 text-center text-gray-600">{item.nilai_harian || 0}</td>
                                                                        <td className="px-4 py-2.5 text-center text-gray-600">{item.nilai_uts || 0}</td>
                                                                        <td className="px-4 py-2.5 text-center text-gray-600">{item.nilai_uas || 0}</td>
                                                                        <td className={`px-4 py-2.5 text-center font-black ${isTuntas ? 'text-green-600' : 'text-red-600'}`}>{na}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer Modal Akumulatif */}
                        <div className="px-6 py-5 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                            <div className="flex gap-8">
                                <div>
                                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rata-Rata Kumulatif (Semua TA)</span>
                                    <span className="text-3xl font-black text-gray-900">{hitungRerata(detailNilai)}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Record Data</span>
                                    <span className="text-3xl font-black text-gray-900">{detailNilai.length}</span>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg">
                                Selesai Meninjau
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ViewData;