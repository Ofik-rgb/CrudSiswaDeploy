import React, { useState, useEffect } from 'react';
import { User, ShieldCheck, Phone, MapPin, Save, Lock, Camera, RefreshCw, AlertTriangle } from 'lucide-react';
import useStore from '../../store/useStore';
import axios from 'axios';

const ProfilKepsek = () => {
    const { authUser, setAuthUser } = useStore();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [formData, setFormData] = useState({
        name: authUser?.name || '',
        nip: authUser?.nip || '',
        no_wa: authUser?.no_wa || '',
        alamat: authUser?.alamat || '',
        password: '',
    });

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(authUser?.foto || null);

    const token = localStorage.getItem('token');

    useEffect(() => {
        if (authUser) {
            setFormData({
                name: authUser.name || '',
                nip: authUser.nip || '',
                no_wa: authUser.no_wa || '',
                alamat: authUser.alamat || '',
                password: '',
            });
            if (authUser.foto) setImagePreview(authUser.foto);
        }
    }, [authUser]);

    // 1. Fungsi konversi gambar ke string Base64 (agar seragam dengan yang lain)
const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result); // reader.result berisi string Base64 panjang
        };
        reader.readAsDataURL(file);
    }
};

// 2. Fungsi Kirim Data sebagai JSON biasa (Aman dari error undefined/500)
const handleUpdate = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // Validasi NIP: Wajib 18 Digit Angka murni
    const nipRegex = /^[0-9]{18}$/;
    if (formData.nip && !nipRegex.test(formData.nip)) {
        setMessage({ 
            type: 'error', 
            text: 'Format NIP salah! NIP pimpinan wajib berisi tepat 18 digit angka tanpa huruf atau spasi.' 
        });
        return;
    }

    setIsLoading(true);

    try {
        // 🎯 KUNCI: Kirim sebagai objek JSON biasa, bukan FormData
        const dataToSend = {
            name: formData.name,
            nip: formData.nip,
            no_wa: formData.no_wa,
            alamat: formData.alamat,
            password: formData.password || undefined, // Hanya kirim jika diisi
            foto: imagePreview // Mengirimkan string Base64 langsung ke req.body.foto
        };

        const res = await axios.put(`http://localhost:5000/api/users/profile/${authUser.id}`, dataToSend, {
            headers: { 
                Authorization: `Bearer ${token}` // Tanpa multipart/form-data
            }
        });

        setAuthUser({ ...authUser, ...res.data.user });
        setMessage({ type: 'success', text: 'Profil pimpinan berhasil diperbarui!' });
        setFormData(prev => ({ ...prev, password: '' }));
    } catch (error) {
        setMessage({ type: 'error', text: error.response?.data?.message || 'Gagal memperbarui profil.' });
    } finally {
        setIsLoading(false);
    }
};

    return (
        <div className="max-w-4xl mx-auto p-6 mt-4 animate-fade-in-up">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                    <User size={32} className="text-amber-500" /> Profil Pimpinan
                </h1>
                <p className="text-gray-500 mt-1">Kelola informasi akun, foto resmi, dan keamanan akses Anda.</p>
            </div>

            {message.text && (
                <div className={`p-4 rounded-2xl mb-6 font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.type === 'success' ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* KARTU VISUAL PROFIL */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center">
                        <div className="relative inline-block mb-6">
                            <div className="w-32 h-32 rounded-full bg-amber-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg mx-auto relative">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Profil" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-4xl font-black text-amber-600">{formData.name?.substring(0, 2).toUpperCase()}</span>
                                )}
                            </div>
                            <label className="absolute bottom-1 right-1 p-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full cursor-pointer shadow-md transition-all hover:scale-110">
                                <Camera size={16} />
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                            </label>
                        </div>

                        <h2 className="text-xl font-black text-gray-900">{formData.name || 'Pimpinan'}</h2>
                        <p className="text-amber-600 font-bold text-xs uppercase tracking-widest mt-1">Kepala Sekolah</p>

                        <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                            <div className="flex items-center gap-3 text-left">
                                <ShieldCheck size={18} className="text-gray-400" />
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Username Sistem</p>
                                    <p className="text-sm font-mono font-bold text-gray-700">{authUser?.username || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FORM EDIT PROFIL */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleUpdate} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <User size={16} className="text-amber-500" /> Nama Lengkap
                                </label>
                                <input
                                    type="text" required
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-amber-500" /> Nomor Induk Pegawai (NIP)
                                </label>
                                <input
                                    type="text"
                                    maxLength={18}
                                    placeholder="Wajib 18 digit angka..."
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-mono"
                                    value={formData.nip} onChange={(e) => setFormData({ ...formData, nip: e.target.value.replace(/\D/g, '') })} // Auto hapus jika diinput huruf
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <Phone size={16} className="text-amber-500" /> No. WhatsApp
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                                value={formData.no_wa} onChange={(e) => setFormData({ ...formData, no_wa: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <MapPin size={16} className="text-amber-500" /> Alamat Instansi / Rumah
                            </label>
                            <textarea
                                rows="3"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all resize-none"
                                value={formData.alamat} onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                            ></textarea>
                        </div>

                        <div className="pt-6 border-t border-gray-100">
                            <label className="block text-sm font-bold text-red-600 mb-2 flex items-center gap-2">
                                <Lock size={16} /> Keamanan Akun (Ganti Password)
                            </label>
                            <input
                                type="password"
                                placeholder="Isi hanya jika ingin mengganti password lama..."
                                className="w-full px-4 py-3 bg-red-50/30 border border-red-100 rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all"
                                value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        <button
                            type="submit" disabled={isLoading}
                            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${isLoading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-amber-500 text-white hover:bg-amber-600 hover:-translate-y-1'
                                }`}
                        >
                            {isLoading ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                            {isLoading ? 'Sedang Memproses...' : 'Simpan Perubahan Data Pimpinan'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProfilKepsek;