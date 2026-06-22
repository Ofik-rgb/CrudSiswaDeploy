import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, X, Save, RefreshCw, Search, UserCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

const KelolaGuru = () => {
    const [guruList, setGuruList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({
        id: null,
        name: "",
        nip: "",
        jenis_kelamin: "Laki-laki",
        no_wa: "",
        password: "",
        mata_pelajaran: ""
    });

    // State Peringatan Real-time
    const [nipError, setNipError] = useState("");

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/api/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGuruList(res.data.filter(u => u.role === 'guru'));
        } catch (error) {
            console.error("Gagal menarik data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // --- HANDLER CHANGE INPUT KHUSUS NIP ---
    const handleNipChange = (e) => {
        const val = e.target.value;

        // Blokir total jika pengguna memasukkan huruf atau karakter non-angka
        if (val !== "" && !/^\d+$/.test(val)) return;

        // Batasi panjang maksimal pengetikan hanya sampai 18 angka
        if (val.length > 18) return;

        setFormData({ ...formData, nip: val });

        // Evaluasi panjang karakter secara real-time untuk memicu teks peringatan
        if (val.length > 0 && val.length < 18) {
            setNipError("NIP pendidik wajib berisi tepat 18 digit angka!");
        } else {
            setNipError("");
        }
    };

    const openAddModal = () => {
        setIsEditMode(false);
        setNipError("");
        setFormData({ id: null, name: "", nip: "", jenis_kelamin: "Laki-laki", no_wa: "", password: "", mata_pelajaran: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (guru) => {
        setIsEditMode(true);
        setNipError("");
        setFormData({
            id: guru.id,
            name: guru.name,
            nip: guru.nip || "",
            jenis_kelamin: guru.jenis_kelamin || "Laki-laki",
            no_wa: guru.no_wa || "",
            mata_pelajaran: guru.spesialisasi || "",
            password: ""
        });
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    const handleSimpan = async (e) => {
        e.preventDefault();

        // Validasi final sebelum request dikirim
        if (formData.nip.length !== 18) {
            setNipError("Data ditolak! Pastikan NIP sudah tepat 18 digit.");
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            if (isEditMode) {
                await axios.put(`http://localhost:5000/api/admin/guru/${formData.id}`, formData, { headers });
                alert("Data guru berhasil diperbarui!");
            } else {
                const payload = {
                    ...formData,
                    role: 'guru',
                    username: formData.nip 
                };
                await axios.post('http://localhost:5000/api/users', payload, { headers });
                alert("Guru baru berhasil didaftarkan!");
            }

            closeModal();
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || "Gagal menyimpan data guru.");
        }
    };

    const handleDelete = async (id, nama) => {
        if (!window.confirm(`Yakin ingin menghapus guru ${nama}?`)) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            alert("Gagal menghapus data guru.");
        }
    };

    const filteredGurus = Array.isArray(guruList) 
        ? guruList.filter(guru => {
            const name = guru?.name ? guru.name.toLowerCase() : '';
            const username = guru?.User?.username ? guru.User.username.toLowerCase() : '';
            const nip = guru?.nip ? guru.nip.toLowerCase() : '';
            const search = searchTerm.toLowerCase();

            return name.includes(search) || username.includes(search) || nip.includes(search);
        })
        : [];

    return (
        <div className="max-w-[90rem] mx-auto p-6 mt-4 animate-fade-in-up">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900">Manajemen Data Guru</h1>
                    <p className="text-gray-500 mt-1">Kelola profil tenaga pendidik, NIP, dan akses login.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchData} className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition">
                        <RefreshCw size={18} className={isLoading ? "animate-spin text-blue-600" : ""} />
                    </button>
                    <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-md">
                        <Plus size={20} /> Daftarkan Guru
                    </button>
                </div>
            </div>

            {/* Tabel & Pencarian */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:w-96">
                        <Search size={18} className="absolute inset-y-0 left-4 top-3.5 text-gray-400" />
                        <input
                            type="text" placeholder="Cari nama atau NIP..."
                            className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-sm font-semibold uppercase border-b border-gray-100">
                                <th className="px-6 py-4">Nama Guru</th>
                                <th className="px-6 py-4">NIP</th>
                                <th className="px-6 py-4">L/P</th>
                                <th className="px-6 py-4">WhatsApp</th>
                                <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan="5" className="text-center py-20 text-gray-400">Memuat data...</td></tr>
                            ) : filteredGurus.length === 0 ? (
                                <tr><td colSpan="5" className="text-center py-20 text-gray-400">Tidak ada data ditemukan.</td></tr>
                            ) : (
                                filteredGurus.map((guru) => (
                                    <tr key={guru.id} className="hover:bg-blue-50/30 transition">
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <div className="bg-blue-100 p-2 rounded-full text-blue-600"><UserCircle size={24} /></div>
                                            <div>
                                                <div className="font-bold text-gray-900">{guru.name}</div>
                                                <div className="text-[10px] text-blue-600 font-bold uppercase">{guru.spesialisasi || 'Umum'}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-600 font-bold">{guru.nip || '-'}</td>
                                        <td className="px-6 py-4">{guru.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}</td>
                                        <td className="px-6 py-4 text-gray-600">{guru.no_wa || '-'}</td>
                                        <td className="px-6 py-4 flex justify-center gap-2">
                                            <button type="button" onClick={() => openEditModal(guru)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit size={18} /></button>
                                            <button type="button" onClick={() => handleDelete(guru.id, guru.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={18} /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL FORM */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-extrabold text-gray-900">{isEditMode ? 'Edit Profil Guru' : 'Daftarkan Guru Baru'}</h3>
                            <button type="button" onClick={closeModal} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSimpan}>
                            <div className="p-6 space-y-5">
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Nama Lengkap & Gelar</label>
                                        <input type="text" required className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">NIP (Username Login)</label>
                                        <input 
                                            type="text" required 
                                            placeholder="Harus 18 digit angka"
                                            className={`w-full px-4 py-2.5 border rounded-xl font-mono outline-none transition-all focus:ring-2 ${nipError ? 'border-red-500 bg-red-50/20 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'}`}
                                            value={formData.nip} 
                                            onChange={handleNipChange} 
                                            disabled={isEditMode}
                                        />
                                        {nipError && (
                                            <p className="mt-1.5 text-xs font-semibold text-red-500 flex items-center gap-1">
                                                <AlertCircle size={12} /> {nipError} ({formData.nip.length}/18)
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Jenis Kelamin</label>
                                        <select className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.jenis_kelamin} onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}>
                                            <option value="Laki-laki">Laki-laki</option>
                                            <option value="Perempuan">Perempuan</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Spesialisasi / Mapel</label>
                                        <input type="text" placeholder="Contoh: Matematika" className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.mata_pelajaran} onChange={(e) => setFormData({ ...formData, mata_pelajaran: e.target.value })} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">No. WhatsApp</label>
                                    <input type="text" className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.no_wa} onChange={(e) => setFormData({ ...formData, no_wa: e.target.value })} />
                                </div>

                                <div className={`${isEditMode ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'} p-4 rounded-xl border`}>
                                    <label className="block text-sm font-bold text-gray-800 mb-1">{isEditMode ? 'Ganti Password' : 'Password Login'}</label>
                                    <p className="text-[10px] text-gray-500 mb-2">{isEditMode ? 'Kosongkan jika tidak ingin mengubah password.' : 'Password awal untuk login guru.'}</p>
                                    <input type="password" required={!isEditMode} className="w-full px-4 py-2.5 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                                <button type="button" onClick={closeModal} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition">Batal</button>
                                <button 
                                    type="submit" 
                                    disabled={formData.nip.length !== 18}
                                    className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md flex items-center gap-2 transition disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                                >
                                    <Save size={18} /> Simpan Data
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KelolaGuru;