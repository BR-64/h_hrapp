import React, { useState, useEffect, useRef } from 'react';
import { Employee } from '../types';
import { User, Phone, Mail, MapPin, Building2, Briefcase, Camera, Save, CheckCircle2, Shield, Info, ArrowRight, RefreshCw, X, Lock, KeyRound, AlertCircle, Eye, EyeOff, ChevronDown, Globe, Plus, Trash2 } from 'lucide-react';

interface ProfilePanelProps {
  currentUser: Employee;
  onUpdateProfile: (emp: Employee) => void;
}

export const ProfilePanel: React.FC<ProfilePanelProps> = ({ currentUser, onUpdateProfile }) => {
  const [formData, setFormData] = useState<Partial<Employee>>({ 
    ...currentUser,
    additionalEmails: currentUser.additionalEmails || []
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change state
  const [passData, setPassData] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState(false);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });

  useEffect(() => {
    setFormData({ 
      ...currentUser,
      additionalEmails: currentUser.additionalEmails || []
    });
  }, [currentUser]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const addEmailField = () => {
    setFormData(prev => ({
      ...prev,
      additionalEmails: [...(prev.additionalEmails || []), '']
    }));
  };

  const removeEmailField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalEmails: (prev.additionalEmails || []).filter((_, i) => i !== index)
    }));
  };

  const handleAdditionalEmailChange = (index: number, value: string) => {
    const updated = [...(formData.additionalEmails || [])];
    updated[index] = value;
    setFormData(prev => ({ ...prev, additionalEmails: updated }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Simulate API delay
    setTimeout(() => {
      onUpdateProfile({
        ...currentUser,
        name: formData.nameTh || formData.nameEn || formData.name || currentUser.name,
        nameTh: formData.nameTh,
        nameEn: formData.nameEn,
        nicknameTh: formData.nicknameTh,
        nicknameEn: formData.nicknameEn,
        nickname: formData.nicknameTh || formData.nickname || currentUser.nickname,
        phone: formData.phone,
        email: formData.email,
        additionalEmails: (formData.additionalEmails || []).filter(email => email.trim() !== ''),
        baseLocation: formData.baseLocation,
        avatar: formData.avatar || currentUser.avatar,
      });
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 800);
  };

  const togglePassVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPass(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(false);

    // Validations
    const actualPass = currentUser.password || 'WORKSYNC-2025';
    if (passData.current !== actualPass) {
      setPassError('รหัสผ่านปัจจุบันไม่ถูกต้อง');
      return;
    }
    if (passData.new.length < 6) {
      setPassError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (passData.new !== passData.confirm) {
      setPassError('การยืนยันรหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }

    setIsUpdatingPass(true);
    setTimeout(() => {
      onUpdateProfile({
        ...currentUser,
        password: passData.new
      });
      setIsUpdatingPass(false);
      setPassSuccess(true);
      setPassData({ current: '', new: '', confirm: '' });
      setTimeout(() => setPassSuccess(false), 5000);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Profile Header */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="px-8 pb-8 pt-8 relative flex flex-col md:flex-row md:items-end gap-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-[2.5rem] bg-white p-1 shadow-xl overflow-hidden">
              <img src={formData.avatar || currentUser.avatar} className="w-full h-full rounded-[2.25rem] object-cover" alt="" />
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
            <button 
              type="button"
              onClick={triggerFileInput}
              className="absolute bottom-1 right-1 p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg border-4 border-white hover:bg-indigo-700 transition-all hover:scale-110"
              title="เปลี่ยนรูปโปรไฟล์"
            >
              <Camera size={16} />
            </button>
          </div>
          
          <div className="flex-1 pb-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              {currentUser.nameTh || currentUser.name}
              {currentUser.role === 'Admin' && <Shield size={20} className="text-rose-500 fill-rose-500" />}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
              <span className="text-sm font-bold text-indigo-600 uppercase tracking-widest">{currentUser.role}</span>
              <span className="text-slate-300">•</span>
              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{currentUser.department}</span>
            </div>
          </div>

          <div className="pb-2">
             <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Status</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile and Security Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* General Information Form */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 lg:p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <User size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Personal Information</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Update your basic profile details</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-l-4 border-indigo-500 pl-3 py-1">
                   Real Name (ชื่อจริง)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Thai (ภาษาไทย)</label>
                    <div className="relative group">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                      <input 
                        type="text" 
                        value={formData.nameTh}
                        onChange={e => setFormData({ ...formData, nameTh: e.target.value })}
                        placeholder="ชื่อ-นามสกุล (ไทย)"
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-200 font-bold text-sm outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">English (ภาษาอังกฤษ)</label>
                    <div className="relative group">
                      <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                      <input 
                        type="text" 
                        value={formData.nameEn}
                        onChange={e => setFormData({ ...formData, nameEn: e.target.value })}
                        placeholder="Full Name (English)"
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-200 font-bold text-sm outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-l-4 border-emerald-500 pl-3 py-1">
                   Nickname (ชื่อเล่น)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Thai (ภาษาไทย)</label>
                    <div className="relative group">
                      <ArrowRight size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                      <input 
                        type="text" 
                        value={formData.nicknameTh}
                        onChange={e => setFormData({ ...formData, nicknameTh: e.target.value })}
                        placeholder="ชื่อเล่น (ไทย)"
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-200 font-bold text-sm outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">English (ภาษาอังกฤษ)</label>
                    <div className="relative group">
                      <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                      <input 
                        type="text" 
                        value={formData.nicknameEn}
                        onChange={e => setFormData({ ...formData, nicknameEn: e.target.value })}
                        placeholder="Nickname (English)"
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-200 font-bold text-sm outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center justify-between border-l-4 border-indigo-500 pl-3 py-1">
                   E-mail Addresses (อีเมล)
                   <button 
                    type="button" 
                    onClick={addEmailField}
                    className="flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all text-[10px] font-black"
                   >
                     <Plus size={12} /> ADD EMAIL
                   </button>
                </h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Email (Login Account)</label>
                    <div className="relative group">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                      <input 
                        type="email" 
                        required
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        placeholder="primary@company.com"
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-200 font-bold text-sm outline-none transition-all"
                      />
                    </div>
                  </div>

                  {formData.additionalEmails?.map((email, index) => (
                    <div key={index} className="space-y-2 animate-in slide-in-from-top-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                        Secondary Email #{index + 1}
                        <button 
                          type="button" 
                          onClick={() => removeEmailField(index)}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 size={12} />
                        </button>
                      </label>
                      <div className="relative group">
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                          type="email" 
                          value={email}
                          onChange={e => handleAdditionalEmailChange(index, e.target.value)}
                          placeholder="secondary@example.com"
                          className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-200 font-bold text-sm outline-none transition-all"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <div className="relative group">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type="tel" 
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-200 font-bold text-sm outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Base Work Location</label>
                  <div className="relative group">
                    <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                    <select 
                      value={formData.baseLocation}
                      onChange={e => setFormData({ ...formData, baseLocation: e.target.value })}
                      className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-200 font-bold text-sm outline-none appearance-none cursor-pointer transition-all"
                    >
                      <option value="" disabled>Select Location</option>
                      <option value="HAND SE (Thonglor)">HAND SE (Thonglor)</option>
                      <option value="KRAC (Chulalongkorn University)">KRAC (Chulalongkorn University)</option>
                    </select>
                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                {showSuccess && (
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm animate-in fade-in slide-in-from-left-2 transition-all">
                    <CheckCircle2 size={18} />
                    Profile updated successfully!
                  </div>
                )}
                <div className="flex-1"></div>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
                >
                  {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                  {isSaving ? 'Saving Changes...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>

          {/* Password and Security Form */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 lg:p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Security & Password</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Change your access credentials</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
                <div className="relative group">
                  <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-rose-500 transition-colors" />
                  <input 
                    type={showPass.current ? "text" : "password"} 
                    required
                    value={passData.current}
                    onChange={e => setPassData({ ...passData, current: e.target.value })}
                    placeholder="Enter current password"
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-rose-100 focus:bg-white focus:border-rose-200 font-bold text-sm outline-none transition-all"
                  />
                  <button type="button" onClick={() => togglePassVisibility('current')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPass.current ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                  <div className="relative group">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type={showPass.new ? "text" : "password"} 
                      required
                      value={passData.new}
                      onChange={e => setPassData({ ...passData, new: e.target.value })}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-200 font-bold text-sm outline-none transition-all"
                    />
                    <button type="button" onClick={() => togglePassVisibility('new')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPass.new ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                  <div className="relative group">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                    <input 
                      type={showPass.confirm ? "text" : "password"} 
                      required
                      value={passData.confirm}
                      onChange={e => setPassData({ ...passData, confirm: e.target.value })}
                      placeholder="Re-enter new password"
                      className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-200 font-bold text-sm outline-none transition-all"
                    />
                    <button type="button" onClick={() => togglePassVisibility('confirm')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPass.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {passError && (
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-3 text-rose-600 text-xs font-bold animate-in shake duration-300">
                  <AlertCircle size={16} />
                  {passError}
                </div>
              )}

              {passSuccess && (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3 text-emerald-600 text-xs font-bold animate-in slide-in-from-top-2">
                  <CheckCircle2 size={16} />
                  รหัสผ่านถูกเปลี่ยนเรียบร้อยแล้ว! โปรดใช้รหัสผ่านใหม่ในการเข้าสู่ระบบครั้งถัดไป
                </div>
              )}

              <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button 
                  type="submit" 
                  disabled={isUpdatingPass || !passData.current || !passData.new || !passData.confirm}
                  className="px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
                >
                  {isUpdatingPass ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                  {isUpdatingPass ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl">
                <Building2 size={20} />
              </div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Corporate Details</h3>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-indigo-500 shadow-sm">
                  <Briefcase size={20} />
                </div>
                <div>
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Position</span>
                   <span className="text-sm font-black text-slate-700">{currentUser.position}</span>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-indigo-500 shadow-sm">
                  <Building2 size={20} />
                </div>
                <div>
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Department</span>
                   <span className="text-sm font-black text-slate-700">{currentUser.department}</span>
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                 <div className="flex items-center gap-2 mb-2">
                    <Info size={14} className="text-amber-600" />
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">HR Notice</span>
                 </div>
                 <p className="text-[10px] font-medium text-amber-700 leading-relaxed">
                   Contact HR to change your department, position, or employment status. These fields are locked for security and auditing purposes.
                 </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
