import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, X, Save, RefreshCw, GraduationCap, Search, ArrowUpRight, AlertCircle, Bookmark } from 'lucide-react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const KelolaSiswa = () => {
    // --- STATE ---
    const [siswaList, setSiswaList] = useState([]);
    const [kelasList, setKelasList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("Aktif"); // 🎯 STATE TAB: "Aktif" atau "Lulus"

    // State Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({
        id: null,
        name: "",
        nisn: "",
        jenis_kelamin: "Laki-laki",
        id_kelas: "",
        status_siswa: "Aktif",
        password: ""
    });

    // State Peringatan Real-time
    const [nisnError, setNisnError] = useState("");

    // --- FUNGSI TARIK DATA ---
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [resUsers, resKelas] = await Promise.all([
                axios.get('http://localhost:5000/api/users', { headers }),
                axios.get('http://localhost:5000/api/kelas', { headers })
            ]);

            // 🎯 LOGIKA SORTING PINTAR ALFANUMERIK UNTUK DROPDOWN MODAL
            const kelasTersortir = resKelas.data.sort((a, b) => {
                return a.nama_kelas.localeCompare(b.nama_kelas, undefined, {
                    numeric: true,
                    sensitivity: 'base'
                });
            });

            setSiswaList(resUsers.data.filter(u => u.role === 'siswa'));
            setKelasList(kelasTersortir); // Menyimpan kelas yang sudah rapi berurutan abjad
        } catch (error) {
            console.error("Gagal menarik data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // --- HANDLER CHANGE INPUT KHUSUS NISN ---
    const handleNisnChange = (e) => {
        const val = e.target.value;
        if (val !== "" && !/^\d+$/.test(val)) return;
        if (val.length > 10) return;

        setFormData({ ...formData, nisn: val });

        if (val.length > 0 && val.length < 10) {
            setNisnError("NISN wajib berisi tepat 10 digit angka!");
        } else {
            setNisnError("");
        }
    };

    // --- FUNGSI HANDLER MODAL ---
    const openAddModal = () => {
        setIsEditMode(false);
        setNisnError("");
        setFormData({ id: null, name: "", nisn: "", jenis_kelamin: "Laki-laki", id_kelas: "", status_siswa: "Aktif", password: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (siswa) => {
        setIsEditMode(true);
        setNisnError("");
        setFormData({
            id: siswa.id,
            name: siswa.name,
            nisn: siswa.nisn,
            jenis_kelamin: siswa.jenis_kelamin || "Laki-laki",
            id_kelas: siswa.id_kelas || "",
            status_siswa: siswa.status_siswa || "Aktif",
            password: ""
        });
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    // --- FUNGSI SIMPAN (TAMBAH/EDIT) ---
    const handleSimpan = async (e) => {
        e.preventDefault();

        if (formData.nisn.length !== 10) {
            setNisnError("Data ditolak! Pastikan NISN sudah tepat 10 digit.");
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const payload = {
                username: formData.nisn ? formData.nisn.trim() : "",
                name: formData.name,
                nisn: formData.nisn,
                jenis_kelamin: formData.jenis_kelamin,
                id_kelas: formData.status_siswa === 'Lulus' ? null : (formData.id_kelas || null),
                status_siswa: formData.status_siswa,
                role: 'siswa'
            };

            if (formData.password) {
                payload.password = formData.password;
            }

            if (isEditMode) {
                const response = await axios.put(`http://localhost:5000/api/users/${formData.id}`, payload, { headers });
                alert(response.data?.message || "Data siswa berhasil diperbarui!");
            } else {
                const response = await axios.post('http://localhost:5000/api/users', payload, { headers });
                alert(response.data?.message || "Siswa baru berhasil didaftarkan!");
            }

            closeModal();
            fetchData();
        } catch (error) {
            console.error("Detail Eror dari Server:", error.response?.data);
            alert(error.response?.data?.message || "Gagal menyimpan data.");
        }
    };

    // --- FUNGSI HAPUS ---
    const handleDelete = async (id, nama) => {
        if (!window.confirm(`Yakin ingin menghapus ${nama}?`)) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            console.error("Gagal hapus:", error.response?.data);
            alert(error.response?.data?.message || "Gagal menghapus data.");
        }
    };

    // 🎯 FILTER 1: Saring berdasarkan Tab Aktif (Status Siswa)
    const statusFilteredSiswa = siswaList.filter(s => (s.status_siswa || 'Aktif') === activeTab);

    // 🎯 FILTER 2: Saring berdasarkan Input Pencarian (Nama/NISN)
    const filteredSiswa = siswaList.filter(s =>
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.nisn && s.nisn.includes(searchTerm))
);

    return (
        <div className="max-w-[90rem] mx-auto p-6 mt-4 animate-fade-in-up">

            {/* Header */}
            <div className="mb-8 flex flex-col xl:flex-row justify-between xl:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900">Manajemen Data Siswa</h1>
                    <p className="text-gray-500 mt-1">Kelola biodata induk, penempatan kelas, status akademik, dan sistem kesiswaan.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={fetchData} className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition" title="Refresh Data">
                        <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                    </button>

                    {/* HIDE AKSES TOMBOL JIKA ADMIN SEDANG DI TAB ALUMNI */}
                    {activeTab === "Aktif" && (
                        <>
                            <Link to="/admin/kenaikan-kelas" className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold hover:bg-indigo-600 hover:text-white transition shadow-sm">
                                <ArrowUpRight size={20} /> Kenaikan Kelas
                            </Link>

                            <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-900 transition shadow-md">
                                <Plus size={20} /> Daftarkan Siswa
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* NAVIGASI TAB FORMAL (SISWA AKTIF VS ALUMNI) */}
            <div className="flex border-b border-gray-200 mb-6 gap-2">
                <button
                    onClick={() => { setActiveTab("Aktif"); setSearchTerm(""); }}
                    className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-all ${activeTab === "Aktif" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                >
                    <Users size={18} /> Siswa Aktif ({siswaList.filter(s => (s.status_siswa || 'Aktif') === 'Aktif').length})
                </button>
                <button
                    onClick={() => { setActiveTab("Lulus"); setSearchTerm(""); }}
                    className={`flex items-center gap-2 px-6 py-3 font-bold text-sm border-b-2 transition-all ${activeTab === "Lulus" ? "border-emerald-600 text-emerald-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                >
                    <Bookmark size={18} /> Alumni / Lulus ({siswaList.filter(s => s.status_siswa === 'Lulus').length})
                </button>
            </div>

            {/* Area Tabel & Pencarian */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:w-96">
                        <Search size={18} className="absolute inset-y-0 left-4 top-3 text-gray-400" />
                        <input
                            type="text" placeholder={activeTab === "Aktif" ? "Cari nama atau NISN siswa aktif..." : "Cari nama atau NISN alumni..."}
                            className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-sm font-semibold uppercase tracking-wider border-b border-gray-100">
                                <th className="px-6 py-4">Nama Siswa</th>
                                <th className="px-6 py-4">NISN</th>
                                <th className="px-6 py-4">L/P</th>
                                <th className="px-6 py-4">Kelas Aktif</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan="6" className="text-center py-10">Memuat data...</td></tr>
                            ) : filteredSiswa.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-10 text-gray-400">Tidak ada data {activeTab === "Aktif" ? "siswa" : "alumni"} ditemukan.</td></tr>
                            ) : (
                                filteredSiswa.map((siswa) => (
                                    <tr key={siswa.id} className="hover:bg-blue-50/30 transition">
                                        <td className="px-6 py-4 font-bold text-gray-900">{siswa.name}</td>
                                        <td className="px-6 py-4 font-mono text-gray-600">{siswa.nisn || '-'}</td>
                                        <td className="px-6 py-4 text-gray-700">{siswa.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}</td>
                                        <td className="px-6 py-4">
                                            {siswa.nama_kelas ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold border border-blue-100">
                                                    <GraduationCap size={16} /> {siswa.nama_kelas}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 text-sm font-bold text-gray-400 w-[95px]">
                                                    -
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${siswa.status_siswa === 'Lulus' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                                {siswa.status_siswa || 'Aktif'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 flex justify-center gap-2">
                                            <button onClick={() => openEditModal(siswa)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit Status/Data"><Edit size={18} /></button>
                                            <button onClick={() => handleDelete(siswa.id, siswa.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Hapus Permanen"><Trash2 size={18} /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- MODAL FORM SISWA --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-extrabold text-gray-900">{isEditMode ? 'Edit Properti & Status Siswa' : 'Daftarkan Siswa Baru'}</h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-red-500"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSimpan}>
                            <div className="p-6 space-y-5">
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label htmlFor="inputStudentName" className="block text-sm font-bold text-gray-700 mb-2">Nama Lengkap</label>
                                        <input
                                            id="inputStudentName" name="name" type="text" required
                                            className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="inputStudentNisn" className="block text-sm font-bold text-gray-700 mb-2">NISN (Sbg. Username Login)</label>
                                        <input
                                            id="inputStudentNisn" name="nisn" type="text" required
                                            placeholder="Harus 10 digit angka"
                                            className={`w-full px-4 py-2.5 border rounded-xl outline-none transition-all focus:ring-2 ${nisnError ? 'border-red-500 bg-red-50/20 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'}`}
                                            value={formData.nisn}
                                            onChange={handleNisnChange}
                                            disabled={isEditMode}
                                        />
                                        {nisnError && (
                                            <p className="mt-1.5 text-xs font-semibold text-red-500 flex items-center gap-1">
                                                <AlertCircle size={12} /> {nisnError} ({formData.nisn.length}/10)
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label htmlFor="selectStudentGender" className="block text-sm font-bold text-gray-700 mb-2">Jenis Kelamin</label>
                                        <select
                                            id="selectStudentGender" name="jenis_kelamin"
                                            className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.jenis_kelamin}
                                            onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                                        >
                                            <option value="Laki-laki">Laki-laki</option>
                                            <option value="Perempuan">Perempuan</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="selectStudentStatus" className="block text-sm font-bold text-gray-700 mb-2">Status Siswa</label>
                                        <select
                                            id="selectStudentStatus" name="status_siswa"
                                            className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                                            value={formData.status_siswa}
                                            onChange={(e) => setFormData({ ...formData, status_siswa: e.target.value })}
                                        >
                                            <option value="Akt" className="text-green-600 font-bold" value="Aktif">Aktif</option>
                                            <option value="Lul" className="text-emerald-600 font-bold" value="Lulus">Lulus (Alumni)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* DROPDOWN PENEMPATAN KELAS (Sudah tersortir rapi sesuai abjad) */}
                                {formData.status_siswa === "Aktif" && (
                                    <div>
                                        <label htmlFor="selectStudentClass" className="block text-sm font-bold text-blue-700 mb-2 flex items-center gap-2"><GraduationCap size={16} /> Penempatan Kelas</label>
                                        <select
                                            id="selectStudentClass" name="id_kelas"
                                            className="w-full px-4 py-2.5 border border-blue-300 bg-blue-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-800"
                                            value={formData.id_kelas}
                                            onChange={(e) => setFormData({ ...formData, id_kelas: e.target.value })}
                                        >
                                            <option value="">-- Belum Ada Kelas --</option>
                                            {kelasList.map(k => (
                                                <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* AREA PASSWORD UPDATE */}
                                {!isEditMode ? (
                                    <div>
                                        <label htmlFor="inputStudentPassword" className="block text-sm font-bold text-gray-700 mb-2">Password Login</label>
                                        <input
                                            id="inputStudentPassword" name="password" type="password" required
                                            className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>
                                ) : (
                                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                        <label htmlFor="inputStudentResetPassword" className="block text-sm font-bold text-amber-800 mb-1">Reset Password</label>
                                        <p className="text-xs text-amber-600 mb-3">Isi hanya jika Anda ingin mengatur ulang password siswa ini. Kosongkan jika tidak.</p>
                                        <input
                                            id="inputStudentResetPassword" name="password" type="text"
                                            placeholder="Ketik password baru untuk siswa..."
                                            className="w-full px-4 py-2.5 border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                                <button type="button" onClick={closeModal} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition">Batal</button>
                                <button
                                    type="submit"
                                    disabled={formData.nisn.length !== 10}
                                    className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition flex items-center gap-2 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
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

export default KelolaSiswa;