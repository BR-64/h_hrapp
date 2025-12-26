import React from 'react';
import { Employee } from '../types';
import { X, User, Mail, Phone, MapPin, Globe, ArrowRight, Shield, Building2 } from 'lucide-react';

interface UserProfileModalProps {
  user: Employee;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] relative">
        {/* Floating Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-all z-10"
        >
          <X size={20} />
        </button>

        <div className="px-8 pb-8 pt-10 relative flex flex-col flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col md:flex-row md:items-end gap-6 mb-8">
            <div className="w-32 h-32 rounded-[2.5rem] bg-white p-1 shadow-xl overflow-hidden flex-shrink-0">
              <img src={user.avatar} className="w-full h-full rounded-[2.25rem] object-cover" alt="" />
            </div>
            <div className="pb-2">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                {user.nicknameTh || user.nickname || user.name}
                {user.role === 'Admin' && <Shield size={20} className="text-rose-500 fill-rose-500" />}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                <span className="text-sm font-bold text-indigo-600 uppercase tracking-widest">{user.role}</span>
                <span className="text-slate-300">•</span>
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{user.department}</span>
              </div>
            </div>
          </div>

          <div className="space-y-8 pb-4">
            {/* Real Names Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <User size={14} className="text-indigo-500" /> Real Name (ชื่อจริง)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Thai Language</span>
                  <p className="text-sm font-black text-slate-700">{user.nameTh || '-'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">English Language</span>
                  <p className="text-sm font-black text-slate-700">{user.nameEn || '-'}</p>
                </div>
              </div>
            </div>

            {/* Nicknames Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <ArrowRight size={14} className="text-emerald-500" /> Nicknames (ชื่อเล่น)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Thai Language</span>
                  <p className="text-sm font-black text-slate-700">{user.nicknameTh || '-'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">English Language</span>
                  <p className="text-sm font-black text-slate-700">{user.nicknameEn || '-'}</p>
                </div>
              </div>
            </div>

            {/* Contact Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Mail size={14} className="text-blue-500" /> Contact Details
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-blue-500">
                    <Mail size={20} />
                  </div>
                  <div className="flex-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Primary Email</span>
                    <p className="text-sm font-black text-slate-700">{user.email}</p>
                  </div>
                </div>

                {user.additionalEmails && user.additionalEmails.length > 0 && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Secondary Emails</span>
                    <div className="space-y-2">
                      {user.additionalEmails.map((email, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm font-bold text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                          {email}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-rose-500">
                      <Phone size={20} />
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Phone</span>
                      <p className="text-sm font-black text-slate-700">{user.phone || '-'}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-amber-500">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Location</span>
                      <p className="text-sm font-black text-slate-700">{user.baseLocation || 'Not Specified'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Building2 size={12} /> Workforce Profile Privacy Enabled
          </p>
        </div>
      </div>
    </div>
  );
};
