import React, { useState } from 'react';
import { Employee, UserRole } from '../types';
import { Mail, Lock, LogIn, Sparkles, AlertCircle, UserPlus, User, Building2, Briefcase } from 'lucide-react';
import { DEPARTMENTS, POSITIONS, DEFAULT_BALANCES } from '../constants';

interface LoginProps {
  employees: Employee[];
  departments: string[];
  positions: string[];
  onLogin: (user: Employee) => void;
  onRegister: (user: Employee) => void;
}

export const Login: React.FC<LoginProps> = ({ employees, departments, positions, onLogin, onRegister }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [dept, setDept] = useState(departments[0]);
  const [pos, setPos] = useState(positions[0]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const user = employees.find(emp => emp.email?.toLowerCase() === email.toLowerCase());
      
      // Use user's password or fallback to initial default if not set (for demo safety)
      const userPassword = user?.password || 'WORKSYNC-2025';

      if (user && password === userPassword) {
        onLogin(user);
      } else if (user && password !== userPassword) {
        setError('Incorrect password');
      } else {
        setError('ไม่พบบัญชีผู้ใช้งานที่ใช้อีเมลนี้');
      }
      setIsLoading(false);
    }, 800);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const exists = employees.find(emp => emp.email?.toLowerCase() === email.toLowerCase());
      if (exists) {
        setError('อีเมลนี้ถูกใช้งานไปแล้วในระบบ');
        setIsLoading(false);
        return;
      }

      const id = `user-${Date.now()}`;
      const newUser: Employee = {
        id,
        name,
        email,
        password: password, // Store provided password during registration
        department: dept,
        position: pos,
        role: 'Employee' as UserRole,
        avatar: `https://picsum.photos/seed/${id}/100/100`,
        balances: { ...DEFAULT_BALANCES }
      };

      onRegister(newUser);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-indigo-100 selection:text-indigo-900 overflow-hidden">
      <div className="w-full max-w-lg animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden relative">
          
          <div className="p-8 pb-4 text-center space-y-4">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-100 ring-8 ring-indigo-50 transform hover:rotate-6 transition-transform">
              <span className="text-white font-black text-3xl">H</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">HAND Social Enterprise</h1>
              <p className="text-slate-400 font-bold text-[9px] uppercase tracking-[0.2em] mt-1">Enterprise Workforce Management</p>
            </div>
          </div>

          <div className="px-8 pb-10 space-y-6">
            <div className="p-1 bg-slate-100 rounded-2xl flex">
              <button 
                onClick={() => setMode('login')}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Sign In
              </button>
              <button 
                onClick={() => setMode('register')}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Register
              </button>
            </div>

            <div className="text-center">
              <h2 className="text-xl font-black text-slate-800">
                {mode === 'login' ? 'Welcome Back' : 'Join Our Team'}
              </h2>
              <p className="text-slate-500 text-sm font-medium mt-1">
                {mode === 'login' ? 'เข้าสู่ระบบจัดการงานของคุณ' : 'สร้างบัญชีพนักงานใหม่เพื่อเริ่มใช้งาน'}
              </p>
            </div>

            <form onSubmit={mode === 'login' ? handleLoginSubmit : handleRegisterSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <User size={12} /> Full Name
                    </label>
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="สมชาย ใจดี"
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:outline-none font-bold text-sm transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Building2 size={12} /> Department
                      </label>
                      <select 
                        value={dept}
                        onChange={(e) => setDept(e.target.value)}
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-xs"
                      >
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Briefcase size={12} /> Position
                      </label>
                      <select 
                        value={pos}
                        onChange={(e) => setPos(e.target.value)}
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none font-bold text-xs"
                      >
                        {positions.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Mail size={12} /> Email Address
                </label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hand.co.th"
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:outline-none font-bold text-sm transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Lock size={12} /> Password
                </label>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:outline-none font-bold text-sm transition-all"
                />
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-start gap-3 animate-in shake duration-300">
                  <AlertCircle size={16} className="text-rose-500 flex-shrink-0 mt-0.5" />
                  <p className="text-rose-600 text-[11px] font-bold leading-relaxed">{error}</p>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <Sparkles size={18} className="animate-spin" />
                ) : (
                  <>
                    {mode === 'login' ? <LogIn size={18} className="group-hover:translate-x-1 transition-transform" /> : <UserPlus size={18} className="group-hover:scale-110 transition-transform" />}
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
        
        <p className="mt-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
          &copy; 2025 HAND Social Enterprise
        </p>
      </div>
    </div>
  );
};