import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, ArrowRight, Save, ShieldCheck, AlertCircle, CheckCircle, Eye, X, GraduationCap } from 'lucide-react';

const KenaikanKelas = () => {
    const [kelasList, setKelasList] = useState([]);
    const [siswaList, setSiswaList] = useState([]);
    
    const [kelasAsal, setKelasAsal] = useState('');
    const [kelasTujuan, setKelasTujuan] = useState('');
    const [selectedSiswa, setSelectedSiswa] = useState([]);
    const [modeKoreksi, setModeKoreksi] = useState(false); // 🎯 STATE BARU UNTUK KOREKSI DATA
    
    // State untuk Modal Transkrip Detail
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeSiswa, setActiveSiswa] = useState(null);
    const [detailNilai, setDetailNilai] = useState([]);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const token = localStorage.getItem('token');

    // --- FUNGSI PINTAR: Mengekstrak angka dari nama kelas (Contoh: "Kelas 2A" -> 2)
    const getGradeLevel = (namaKelas) => {
        if (!namaKelas) return 0;
        const match = namaKelas.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
    };

    // 1. Ambil Data Kelas + 🎯 LOGIKA SORTING PINTAR ALFANUMERIK
    useEffect(() => {
        const fetchKelas = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/kelas', { headers: { Authorization: `Bearer ${token}` } });
                
                // Urutkan kelas berdasarkan abjad & angka (E.g. Kelas 1A, Kelas 1B, Kelas 2A...)
                const kelasTersortir = res.data.sort((a, b) => {
                    return a.nama_kelas.localeCompare(b.nama_kelas, undefined, {
                        numeric: true,
                        sensitivity: 'base'
                    });
                });
                
                setKelasList(kelasTersortir);
            } catch (error) { console.error("Gagal memuat kelas"); }
        };
        fetchKelas();
    }, [token]);

    // 2. Ambil Rekap Siswa Cerdas
    useEffect(() => {
        const fetchSiswaRekap = async () => {
            if (!kelasAsal) { setSiswaList([]); return; }
            setIsLoading(true);
            try {
                const res = await axios.get(`http://localhost:5000/api/admin/rekap-kelas/${kelasAsal}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const dataSiswa = res.data;
                setSiswaList(dataSiswa);
                
                // AUTO-CHECK: Layak Naik = Mapel Merah 0 dan Ada Nilai
                const layakNaikIds = dataSiswa.filter(s => s.mapel_merah === 0 && s.total_mapel > 0).map(s => s.id);
                setSelectedSiswa(layakNaikIds);
            } catch (error) { console.error("Gagal memuat rekap siswa"); } 
            finally { setIsLoading(false); }
        };
        fetchSiswaRekap();
    }, [kelasAsal, token]);

    // --- BUKA MODAL DETAIL NILAI ---
    const openDetailModal = async (siswa) => {
        setActiveSiswa(siswa);
        setIsModalOpen(true);
        setIsLoadingDetail(true);
        try {
            const res = await axios.get(`http://localhost:5000/api/admin/nilai-siswa/${siswa.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDetailNilai(res.data);
        } catch (error) {
            console.error("Gagal menarik detail nilai");
        } finally {
            setIsLoadingDetail(false);
        }
    };

    // 3. Handle Checkbox & Eksekusi Kenaikan / Kelulusan
    const handleCheck = (id) => setSelectedSiswa(prev => prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]);
    const handleCheckAll = () => selectedSiswa.length === siswaList.length ? setSelectedSiswa([]) : setSelectedSiswa(siswaList.map(s => s.id));

    // --- LOGIKA UTAMA SINKRONISASI TUJUAN ---
    const kelasAsalObj = kelasList.find(k => k.id === parseInt(kelasAsal));
    const levelAsal = getGradeLevel(kelasAsalObj?.nama_kelas);
    const isKelas6 = levelAsal === 6; // 🎯 DETEKSI JIKA KELAS 6

    const handleProses = async () => {
        if (selectedSiswa.length === 0) return alert("Pilih minimal 1 siswa!");
        if (!isKelas6 && !kelasTujuan && !modeKoreksi) return alert("Pilih kelas tujuan terlebih dahulu!");
        if (modeKoreksi && !kelasTujuan) return alert("Pilih kelas koreksi terlebih dahulu!");
        
        let teksKonfirmasi = `Yakin menaikkan ${selectedSiswa.length} siswa?\n(Siswa yang tidak dicentang otomatis tinggal kelas).`;
        
        if (modeKoreksi) {
            teksKonfirmasi = `⚠️ PERINGATAN KOREKSI DATA CRITICAL!\n\nApakah Anda yakin ingin melakukan re-undo / koreksi kelas secara massal untuk ${selectedSiswa.length} siswa terpilih ke kelas tujuan baru?`;
        } else if (isKelas6) {
            teksKonfirmasi = `Yakin meluluskan ${selectedSiswa.length} siswa kelas 6?\n(Siswa yang tidak dicentang otomatis tinggal kelas).`;
        }

        if (!window.confirm(teksKonfirmasi)) return;

        setIsLoading(true); setMessage('');
        try {
            const payload = modeKoreksi
                ? { siswaIds: selectedSiswa, targetKelasId: parseInt(kelasTujuan), statusBaru: 'Aktif' }
                : isKelas6 
                    ? { siswaIds: selectedSiswa, targetKelasId: null, statusBaru: 'Lulus' }
                    : { siswaIds: selectedSiswa, targetKelasId: parseInt(kelasTujuan), statusBaru: 'Aktif' };

            const res = await axios.put('http://localhost:5000/api/admin/promosi-kelas', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setMessage(res.data.message);
            setSiswaList(prev => prev.filter(s => !selectedSiswa.includes(s.id)));
            setSelectedSiswa([]); 
            setKelasTujuan('');
            setModeKoreksi(false); 
        } catch (error) { 
            setMessage(error.response?.data?.message || "Terjadi kesalahan."); 
        } finally { 
            setIsLoading(false); 
        }
    };

    // Filter Opsi Kelas Tujuan (Adaptif Berdasarkan Status Mode Koreksi)
    const opsiKelasTujuan = kelasList.filter(k => {
        if (modeKoreksi) {
            return k.id !== parseInt(kelasAsal);
        }
        const levelTujuan = getGradeLevel(k.nama_kelas);
        return levelTujuan > levelAsal; 
    });

    return (
        <div className="max-w-[90rem] mx-auto p-6 mt-4 animate-fade-in-up">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                    <Users size={32} className="text-indigo-600" />
                    Proses Kenaikan Kelas & Kelulusan
                </h1>
                <p className="text-gray-500 mt-1">Evaluasi akademik mendalam dan pindahkan siswa ke jenjang berikutnya atau kelulusan alumni.</p>
            </div>

            {message && <div className="bg-green-50 text-green-800 p-4 rounded-xl mb-6 font-bold flex items-center gap-2"><ShieldCheck size={20} /> {message}</div>}

            {/* Panel Kontrol */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8 flex flex-col gap-4">
                
                {/* HEADER SWITCH MODE KOREKSI DARURAT */}
                <div className="flex items-center justify-end">
                    <label className="inline-flex items-center gap-2 cursor-pointer bg-amber-50 text-amber-800 hover:bg-red-50 hover:text-red-800 transition-colors px-4 py-1.5 rounded-xl border border-amber-100 text-xs font-bold shadow-sm select-none">
                        <input 
                            type="checkbox" 
                            checked={modeKoreksi} 
                            onChange={(e) => {
                                setModeKoreksi(e.target.checked);
                                setKelasTujuan('');
                            }} 
                            className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                        />
                        ⚠️ AKTIFKAN MODE KOREKSI DATA (SALAH INPUT KENAIKAN)
                    </label>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="w-full md:w-1/3">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Pilih Kelas Saat Ini</label>
                        <select value={kelasAsal} onChange={(e) => { setKelasAsal(e.target.value); setKelasTujuan(''); }} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">-- Pilih Kelas --</option>
                            {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                        </select>
                    </div>

                    <div className="hidden md:flex flex-col items-center justify-center text-gray-300 px-4">
                        <ArrowRight size={32} />
                        <span className={`text-xs font-bold uppercase mt-1 tracking-widest ${modeKoreksi ? 'text-red-500 font-black animate-pulse' : 'text-gray-400'}`}>
                            {modeKoreksi ? 'Dikoreksi Ke' : 'Dipindah Ke'}
                        </span>
                    </div>

                    <div className="w-full md:w-1/3">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Pilih Jenjang Selanjutnya</label>
                        {isKelas6 && !modeKoreksi ? (
                            <div className="w-full p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded-xl flex items-center justify-center gap-2 font-mono uppercase text-sm">
                                <GraduationCap size={18}/> Alumni / Lulus Sekolah
                            </div>
                        ) : (
                            <select 
                                value={kelasTujuan} 
                                onChange={(e) => setKelasTujuan(e.target.value)} 
                                disabled={!kelasAsal} 
                                className={`w-full p-3 border font-bold rounded-xl outline-none focus:ring-2 disabled:opacity-50 transition-all ${
                                    modeKoreksi 
                                        ? 'bg-red-50 border-red-200 text-red-900 focus:ring-red-500' 
                                        : 'bg-indigo-50 border-indigo-200 text-indigo-900 focus:ring-indigo-500'
                                }`}
                            >
                                <option value="">-- Tentukan Kelas --</option>
                                {opsiKelasTujuan.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                            </select>
                        )}
                    </div>

                    <div className="w-full md:w-1/4 flex items-end h-full">
                        <button 
                            onClick={handleProses} 
                            disabled={isLoading || selectedSiswa.length === 0 || (!isKelas6 && !kelasTujuan && !modeKoreksi) || (modeKoreksi && !kelasTujuan)} 
                            className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                isLoading || selectedSiswa.length === 0 || (!isKelas6 && !kelasTujuan && !modeKoreksi) || (modeKoreksi && !kelasTujuan)
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                    : modeKoreksi 
                                        ? 'bg-red-600 text-white hover:bg-red-700 hover:-translate-y-0.5 shadow-md shadow-red-200'
                                        : isKelas6 
                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:-translate-y-0.5 shadow-md shadow-emerald-200' 
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-0.5 shadow-md shadow-indigo-200'
                            }`}
                        >
                            {modeKoreksi ? <AlertCircle size={20} /> : isKelas6 ? <GraduationCap size={20} /> : <Save size={20} />}
                            {modeKoreksi ? 'Koreksi Pindah Kelas' : isKelas6 ? 'Proses Kelulusan' : 'Naik Kelas'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabel Daftar Siswa */}
            {kelasAsal && (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 border-b p-4 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">Daftar Evaluasi Siswa</h3>
                        <span className="text-sm bg-indigo-100 text-indigo-800 px-4 py-2 rounded-xl font-bold">Terpilih: {selectedSiswa.length} / {siswaList.length}</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-white border-b text-sm text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-4 w-16 text-center"><input type="checkbox" checked={siswaList.length > 0 && selectedSiswa.length === siswaList.length} onChange={handleCheckAll} className="w-5 h-5 text-indigo-600 rounded" /></th>
                                    <th className="px-6 py-4">Siswa</th>
                                    <th className="px-6 py-4 text-center">Rata-Rata</th>
                                    <th className="px-6 py-4 text-center">Status Mapel</th>
                                    <th className="px-6 py-4">Rekomendasi</th>
                                    <th className="px-6 py-4 text-center">Transkrip</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {siswaList.map(siswa => {
                                    const isLayak = siswa.mapel_merah === 0 && siswa.total_mapel > 0;
                                    return (
                                        <tr key={siswa.id} className={selectedSiswa.includes(siswa.id) ? 'bg-indigo-50/30' : 'hover:bg-gray-50'}>
                                            <td className="px-6 py-4 text-center"><input type="checkbox" checked={selectedSiswa.includes(siswa.id)} onChange={() => handleCheck(siswa.id)} className="w-5 h-5 text-indigo-600 rounded cursor-pointer"/></td>
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-gray-900">{siswa.name}</p>
                                                <p className="font-mono text-xs text-gray-500">{siswa.nisn}</p>
                                            </td>
                                            <td className="px-6 py-4 text-center font-black text-lg text-gray-800">{siswa.rata_rata || '-'}</td>
                                            <td className="px-6 py-4 text-center">
                                                {siswa.total_mapel === 0 ? <span className="text-gray-400 text-xs">Kosong</span> : 
                                                 siswa.mapel_merah > 0 ? <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold border border-red-200">{siswa.mapel_merah} Merah</span> : 
                                                 <span className="text-green-600 text-xs font-bold">Semua Tuntas</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                {isLayak ? (
                                                    <span className={`inline-flex items-center gap-1.5 font-bold text-sm ${isKelas6 ? 'text-emerald-700' : 'text-green-700'}`}>
                                                        <CheckCircle size={16}/> {isKelas6 ? 'Siap Lulus' : 'Layak Naik'}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 text-yellow-700 font-bold text-sm"><AlertCircle size={16}/> Tinjau Ulang</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button onClick={() => openDetailModal(siswa)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition" title="Lihat Detail Transkrip">
                                                    <Eye size={20} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL TRANSKRIP DETAIL NILAI SISWA */}
            {isModalOpen && activeSiswa && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                            <div>
                                <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2"><Users size={24} className="text-blue-600"/> Transkrip Nilai Siswa</h3>
                                <p className="text-sm font-bold text-gray-500 mt-1">{activeSiswa.name} ({activeSiswa.nisn})</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-200 text-gray-600 rounded-full hover:bg-red-500 hover:text-white transition"><X size={20} /></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto bg-white">
                            {isLoadingDetail ? (
                                <p className="text-center py-10 text-gray-500 font-medium">Mengambil data dari server...</p>
                            ) : detailNilai.length === 0 ? (
                                <div className="text-center py-12">
                                    <AlertCircle size={48} className="mx-auto text-gray-300 mb-3" />
                                    <p className="text-gray-500">Belum ada nilai sama sekali untuk siswa ini.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border border-gray-100 rounded-lg overflow-hidden">
                                    <thead>
                                        <tr className="bg-blue-50 text-blue-800 text-sm font-bold uppercase">
                                            <th className="px-4 py-3">Mata Pelajaran</th>
                                            <th className="px-4 py-3 text-center">Semester</th>
                                            <th className="px-4 py-3 text-center">KKM</th>
                                            <th className="px-4 py-3 text-center">Nilai Akhir</th>
                                            <th className="px-4 py-3 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {detailNilai.map((item, index) => {
                                            const na = Math.round(((item.nilai_harian||0)*0.2) + ((item.nilai_uts||0)*0.3) + ((item.nilai_uas||0)*0.5));
                                            const isTuntas = na >= (item.kkm || 75);
                                            return (
                                                <tr key={index} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-bold text-gray-800">{item.nama_mapel}</td>
                                                    <td className="px-4 py-3 text-center text-gray-500">{item.semester || 'Ganjil'}</td>
                                                    <td className="px-4 py-3 text-center font-mono text-gray-400">{item.kkm || 75}</td>
                                                    <td className={`px-4 py-3 text-center font-black text-lg ${isTuntas ? 'text-green-600' : 'text-red-600'}`}>{na}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        {isTuntas ? <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">TUNTAS</span> 
                                                                  : <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">REMEDIAL</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                            <div>
                                <span className="block text-xs font-bold text-gray-400 uppercase">Rata-Rata Keseluruhan</span>
                                <span className="text-2xl font-black text-gray-900">{activeSiswa.rata_rata || '0.0'}</span>
                            </div>
                            <div className="flex gap-3">
                                {activeSiswa.mapel_merah > 0 && (
                                    <span className="flex items-center gap-2 text-sm font-bold text-red-600 bg-red-50 px-4 py-2 rounded-xl border border-red-200">
                                        <AlertCircle size={18}/> Perlu Pembinaan
                                    </span>
                                )}
                                <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition">Tutup Detail</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KenaikanKelas;