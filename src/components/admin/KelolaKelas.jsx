import React, { useState, useEffect } from 'react';
import { Users, Crown, BookOpen, Plus, Edit, Trash2, X, Save, RefreshCw } from 'lucide-react';
import axios from 'axios';

const KelolaKelas = () => {
    const [kelasList, setKelasList] = useState([]);
    const [guruList, setGuruList] = useState([]);
    const [mapelList, setMapelList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedKelas, setSelectedKelas] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    const [tingkatKelas, setTingkatKelas] = useState("Kelas 1");
    const [abjadKelas, setAbjadKelas] = useState("A");

    // 🛠️ PENGATURAN DROPDOWN DINAMIS
    const listAbjadTersedia = ["A", "B", "C", "D", "E"]; 

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [resKelas, resMapel, resUsers] = await Promise.all([
                axios.get('http://localhost:5000/api/kelas', { headers }),
                axios.get('http://localhost:5000/api/mapel', { headers }),
                axios.get('http://localhost:5000/api/users', { headers })
            ]);

            // 🎯 LOGIKA SORTING PINTAR BERDASARKAN ABJAD & ANGKA NAMA KELAS (Kelas 1A, Kelas 1B, Kelas 2A...)
            const kelasTersortir = resKelas.data.sort((a, b) => {
                return a.nama_kelas.localeCompare(b.nama_kelas, undefined, {
                    numeric: true,
                    sensitivity: 'base'
                });
            });

            setKelasList(kelasTersortir);
            setMapelList(resMapel.data);
            setGuruList(resUsers.data.filter(u => u.role === 'guru'));
        } catch (error) {
            console.error("Gagal mengambil data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchAllData(); }, []);

    // 🛠️ FUNGSI HAPUS KELAS PERMANEN
    const handleHapusKelas = async (id, namaKelas) => {
        const konfirmasi = window.confirm(`Apakah Anda yakin ingin menghapus ${namaKelas}?\n\nPERINGATAN: Menghapus kelas akan menghapus semua penugasan guru dan nilai terkait di kelas ini secara permanen!`);
        if (!konfirmasi) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/kelas/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert(`${namaKelas} berhasil dihapus dari sistem.`);
            fetchAllData(); 
        } catch (error) {
            console.error("Gagal menghapus kelas:", error);
            alert(error.response?.data?.message || "Gagal menghapus kelas. Periksa kembali relasi data di backend.");
        }
    };

    const openModal = (kelas) => {
        setSelectedKelas(JSON.parse(JSON.stringify(kelas))); 
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedKelas(null);
    };

    const handleAddMapel = () => {
        setSelectedKelas({
            ...selectedKelas,
            Penugasan: [...(selectedKelas.Penugasan || []), { id_mapel: '', id_guru: '' }]
        });
    };

    const handleRemoveMapel = (index) => {
        const newPenugasan = selectedKelas.Penugasan.filter((_, i) => i !== index);
        setSelectedKelas({ ...selectedKelas, Penugasan: newPenugasan });
    };

    const handleSimpanPenugasan = async () => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const penugasanValid = selectedKelas.Penugasan.filter(p => p.id_mapel && p.id_guru);
            
            const payloadToSend = {
                wali_kelas_id: selectedKelas.id_wali_kelas || null,
                penugasan_mapel: penugasanValid
            };

            await axios.put(
                `http://localhost:5000/api/kelas/${selectedKelas.id}/penugasan`, 
                payloadToSend, 
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert(`Penugasan kelas ${selectedKelas.nama_kelas} berhasil disimpan!`);
            closeModal();
            fetchAllData(); 
        } catch (error) {
            alert("Gagal menyimpan perubahan ke database.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleTambahKelasBaru = async (e) => {
        e.preventDefault();
        const finalClassName = `${tingkatKelas}${abjadKelas}`;
        
        setIsAdding(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                'http://localhost:5000/api/kelas',
                { nama_kelas: finalClassName },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            alert(`${finalClassName} berhasil dibuat!`);
            setIsAddModalOpen(false);
            setTingkatKelas("Kelas 1");
            setAbjadKelas("A");
            fetchAllData();
        } catch (error) {
            alert(error.response?.data?.message || `Gagal menambah kelas baru. Kemungkinan ${finalClassName} sudah ada.`);
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="max-w-[90rem] mx-auto p-6 mt-4 animate-fade-in-up">
            {/* Top Bar Header */}
            <div className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900">Manajemen Kelas & Penugasan</h1>
                    <p className="text-gray-500 mt-1">Atur Wali Kelas dan penugasan Guru Mata Pelajaran secara *real-time*.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchAllData} className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition flex items-center gap-2">
                        <RefreshCw size={18} className={isLoading ? "animate-spin text-blue-600" : ""} />
                    </button>
                    <button 
                        onClick={() => setIsAddModalOpen(true)} 
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-md"
                    >
                        <Plus size={20} /> Tambah Kelas
                    </button>
                </div>
            </div>

            {/* Area Peta Kartu Kelas (Dengan Kondisi Loading & Pengelompokan Angkatan) */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-blue-600">
                    <RefreshCw size={40} className="animate-spin mb-4" />
                    <p className="font-semibold text-gray-500">Menarik data dari database...</p>
                </div>
            ) : kelasList.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-white rounded-3xl border border-dashed border-gray-300">
                    Belum ada kelas yang terdaftar. Silakan klik "Tambah Kelas".
                </div>
            ) : (
                <div className="space-y-10">
                    {/* 🎯 PROSES EKSTRAK ANGKA ANGKATAN SECARA AMAN (E.g. "Kelas 1", "Kelas 2") */}
                    {[...new Set(kelasList.map(k => {
                        const kata = k.nama_kelas.split(" ");
                        const angka = kata[1] ? kata[1].match(/\d+/) : "";
                        return `Kelas ${angka ? angka[0] : ""}`;
                    }))].map((tingkat) => {
                        // Filter kelas yang merupakan anak dari kelompok angkatan ini
                        const kelasPerTingkat = kelasList.filter(k => k.nama_kelas.startsWith(tingkat));

                        return (
                            <div key={tingkat} className="bg-gray-50/60 p-6 rounded-[2.5rem] border border-gray-200/60 transition-all">
                                
                                {/* Label Induk Angkatan Rombel */}
                                <div className="mb-5 flex items-center gap-3 px-2">
                                    <div className="h-6 w-2 bg-blue-600 rounded-full"></div>
                                    <h3 className="text-xl font-extrabold text-gray-800">{tingkat}</h3>
                                    <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                                        {kelasPerTingkat.length} Ruangan Aktif
                                    </span>
                                </div>

                                {/* Grid Kartu Internal per Angkatan yang Terisolasi */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {kelasPerTingkat.map((kelas) => (
                                        <div key={kelas.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all group relative overflow-hidden flex flex-col justify-between min-h-[250px]">
                                            <div className="absolute top-0 left-0 w-full h-1.5 bg-[#03045E]"></div>
                                            
                                            <div>
                                                {/* Header Kartu Kelas + Aksi */}
                                                <div className="flex justify-between items-start mb-4 mt-2">
                                                    <h2 className="text-3xl font-black text-[#03045E]">{kelas.nama_kelas}</h2>
                                                    <div className="flex items-center gap-1">
                                                        <button 
                                                            onClick={() => handleHapusKelas(kelas.id, kelas.nama_kelas)}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                            title={`Hapus ${kelas.nama_kelas}`}
                                                        >
                                                            <Trash2 size={20} />
                                                        </button>
                                                        <div className="bg-blue-50 p-2 rounded-xl text-blue-600"><Users size={24} /></div>
                                                    </div>
                                                </div>

                                                {/* Detail Konten Rinci */}
                                                <div className="space-y-4 mb-6">
                                                    <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-center gap-3">
                                                        <div className="bg-amber-200/50 p-1.5 rounded-lg text-amber-700"><Crown size={18} /></div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Wali Kelas</p>
                                                            <p className="text-sm font-semibold text-gray-900">{kelas.WaliKelas?.name || 'Belum Diatur'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 px-1">
                                                        <BookOpen size={18} className="text-gray-400" />
                                                        <p className="text-sm text-gray-600"><span className="font-bold text-gray-900">{kelas.Penugasan?.length || 0}</span> Mata Pelajaran terisi</p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <button onClick={() => openModal(kelas)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-blue-100 text-blue-700 rounded-xl font-bold hover:bg-blue-50 hover:border-blue-300 transition-colors mt-auto">
                                                <Edit size={16} /> Atur Penugasan
                                            </button>
                                        </div>
                                    ))}
                                </div>

                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL TAMBAH KELAS BARU */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-extrabold text-gray-900">Tambah Kelas Baru</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-gray-400 hover:text-red-500 rounded-xl transition">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleTambahKelasBaru}>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-800 mb-2">Tingkat</label>
                                        <select 
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold bg-gray-50"
                                            value={tingkatKelas} 
                                            onChange={(e) => setTingkatKelas(e.target.value)}
                                        >
                                            <option value="Kelas 1">Kelas 1</option>
                                            <option value="Kelas 2">Kelas 2</option>
                                            <option value="Kelas 3">Kelas 3</option>
                                            <option value="Kelas 4">Kelas 4</option>
                                            <option value="Kelas 5">Kelas 5</option>
                                            <option value="Kelas 6">Kelas 6</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-800 mb-2">Paralel / Ruang</label>
                                        <select 
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold bg-gray-50 text-blue-700"
                                            value={abjadKelas} 
                                            onChange={(e) => setAbjadKelas(e.target.value)}
                                        >
                                            {listAbjadTersedia.map(huruf => (
                                                <option key={huruf} value={huruf}>{huruf}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-blue-50 border border-blue-100 p-3 rounded-2xl text-center">
                                    <p className="text-xs text-gray-500">Pratinjau Format Nama Kelas:</p>
                                    <p className="text-xl font-black text-blue-900 mt-1 font-mono">{tingkatKelas}{abjadKelas}</p>
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl">Batal</button>
                                <button type="submit" disabled={isAdding} className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 disabled:bg-blue-400">
                                    {isAdding ? 'Menyimpan...' : 'Buat Kelas'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL PENGATURAN PENUGASAN MAPEL GURU */}
            {isModalOpen && selectedKelas && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-extrabold text-gray-900">Atur Penugasan: {selectedKelas.nama_kelas}</h3>
                            <button onClick={closeModal} className="p-2 text-gray-400 hover:text-red-500 rounded-xl transition"><X size={24} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-8">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider"><Crown size={18} className="text-amber-500" /> Wali Kelas Utama</label>
                                <select className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
                                    value={selectedKelas.id_wali_kelas || ""} onChange={(e) => setSelectedKelas({...selectedKelas, id_wali_kelas: e.target.value})}>
                                    <option value="">-- Kosongkan Wali Kelas --</option>
                                    {guruList.map(guru => <option key={guru.id} value={guru.id}>{guru.name}</option>)}
                                </select>
                            </div>
                            <hr className="border-gray-100" />
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-800 uppercase tracking-wider"><BookOpen size={18} className="text-blue-500" /> Guru Mata Pelajaran</label>
                                    <button onClick={handleAddMapel} className="text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1"><Plus size={16} /> Tambah Mapel</button>
                                </div>
                                <div className="space-y-3">
                                    {(!selectedKelas.Penugasan || selectedKelas.Penugasan.length === 0) && <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500 text-sm">Belum ada mata pelajaran.</div>}
                                    {selectedKelas.Penugasan?.map((tugas, index) => (
                                        <div key={index} className="flex flex-col sm:flex-row gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl items-center">
                                            <select className="w-full sm:w-1/3 px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm" value={tugas.id_mapel || ""}
                                                onChange={(e) => { const newPenugasan = [...selectedKelas.Penugasan]; newPenugasan[index].id_mapel = e.target.value; setSelectedKelas({...selectedKelas, Penugasan: newPenugasan}); }}>
                                                <option value="" disabled>-- Pilih Pelajaran --</option>
                                                {mapelList.map(m => <option key={m.id} value={m.id}>{m.nama_mapel}</option>)}
                                            </select>
                                            <span className="hidden sm:block text-gray-400 text-xs font-semibold">diajar oleh</span>
                                            <select className="w-full sm:flex-1 px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm font-medium" value={tugas.id_guru || ""}
                                                onChange={(e) => { const newPenugasan = [...selectedKelas.Penugasan]; newPenugasan[index].id_guru = e.target.value; setSelectedKelas({...selectedKelas, Penugasan: newPenugasan}); }}>
                                                <option value="" disabled>-- Pilih Guru --</option>
                                                {guruList.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                            </select>
                                            <button onClick={() => handleRemoveMapel(index)} className="p-2 text-red-400 hover:text-red-600 transition"><Trash2 size={18} /></button>
                                        </div>
                                    ))} 
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={closeModal} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl">Batal</button>
                            <button onClick={handleSimpanPenugasan} disabled={isSaving} className={`px-5 py-2.5 text-white font-bold rounded-xl flex items-center gap-2 shadow-md ${isSaving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                <Save size={18} /> {isSaving ? 'Menyimpan...' : 'Simpan ke Database'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KelolaKelas;