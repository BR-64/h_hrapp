import React, { useState, useRef } from 'react';
// Added missing format import from date-fns
import { format } from 'date-fns';
import { Employee, UserRole, LeaveType, LeaveBalance, CompanyHoliday } from '../types';
import { 
  Users, UserPlus, Trash2, Edit2, Shield, User, Briefcase, 
  Search, X, Key, UserCheck, ChevronDown, Copy, CheckCircle2,
  Building2, PlusCircle, Settings2, BriefcaseIcon, Save, Ban, Phone, Mail, MapPin, Contact, ScrollText, Info, CalendarDays, Plus, Sparkles, RefreshCw, Link as LinkIcon, Globe, AlertTriangle, Camera
} from 'lucide-react';
import { DEFAULT_BALANCES } from '../constants';
import * as holidaysApi from '../api/holidays';

interface AdminPanelProps {
  employees: Employee[];
  departments: string[];
  positions: string[];
  holidays: CompanyHoliday[];
  onAddEmployee: (employee: Employee) => void;
  onRemoveEmployee: (id: string) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onSaveSettings: (depts: string[], positions: string[], holidays: CompanyHoliday[]) => void;
  onViewProfile?: (user: Employee) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  employees, 
  departments,
  positions,
  holidays,
  onAddEmployee, 
  onRemoveEmployee,
  onUpdateEmployee,
  onSaveSettings,
  onViewProfile
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Confirmation states
  const [deletingEmp, setDeletingEmp] = useState<Employee | null>(null);

  // Settings Management State (Local Temp Storage)
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'dept' | 'pos' | 'hol'>('dept');
  const [newEntryName, setNewEntryName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [tempDepts, setTempDepts] = useState<string[]>([]);
  const [tempPos, setTempPos] = useState<string[]>([]);
  const [tempHolidays, setTempHolidays] = useState<CompanyHoliday[]>([]);
  const [isFetchingHolidays, setIsFetchingHolidays] = useState(false);
  const [customHolidayApiUrl, setCustomHolidayApiUrl] = useState('');

  // Password Reset State
  const [resettingUser, setResettingUser] = useState<Employee | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '',
    nameTh: '',
    nameEn: '',
    nicknameTh: '',
    nicknameEn: '',
    nickname: '',
    phone: '',
    email: '',
    additionalEmails: [],
    baseLocation: '',
    avatar: '',
    department: departments[0],
    position: '',
    role: 'Employee',
    managerId: '',
    balances: { ...DEFAULT_BALANCES }
  });

  const generateRandomPassword = (length: number = 10) => {
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous characters
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  };

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.nickname && e.nickname.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (e.nicknameTh && e.nicknameTh.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (e.nameTh && e.nameTh.toLowerCase().includes(searchTerm.toLowerCase())) ||
    e.position?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const potentialApprovers = employees.filter(e => 
    ['Manager', 'Admin'].includes(e.role)
  );

  const handleOpenSettings = () => {
    setTempDepts([...departments]);
    setTempPos([...positions]);
    setTempHolidays([...holidays]);
    setNewEntryName('');
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  const handleAddEntry = () => {
    if (newEntryName.trim()) {
      if (settingsTab === 'dept') {
        if (!tempDepts.includes(newEntryName.trim())) {
          setTempDepts([...tempDepts, newEntryName.trim()]);
        }
      } else if (settingsTab === 'pos') {
        if (!tempPos.includes(newEntryName.trim())) {
          setTempPos([...tempPos, newEntryName.trim()]);
        }
      } else if (settingsTab === 'hol') {
        const id = `hol-${Date.now()}`;
        setTempHolidays([...tempHolidays, { id, name: newEntryName.trim(), date: newHolidayDate }]);
      }
      setNewEntryName('');
    }
  };

  const fetchThaiHolidaysAI = async () => {
    setIsFetchingHolidays(true);
    try {
      const result = await holidaysApi.fetchFromAI();
      updateTempHolidays(result.holidays);
    } catch (error) {
      console.error("Failed to fetch Thai holidays via AI:", error);
      alert("ไม่สามารถดึงข้อมูลวันหยุดผ่าน AI ได้ในขณะนี้ (GEMINI_API_KEY may not be set on server)");
    } finally {
      setIsFetchingHolidays(false);
    }
  };

  const fetchHolidaysFromCustomApi = async () => {
    if (!customHolidayApiUrl.trim()) {
      alert("กรุณาระบุ URL ของ API");
      return;
    }
    setIsFetchingHolidays(true);
    try {
      const response = await fetch(customHolidayApiUrl);
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      
      const normalized = (Array.isArray(data) ? data : (data.holidays || data.data || [])).map((h: any, i: number) => ({
        id: h.id || `api-${Date.now()}-${i}`,
        date: h.date || h.holiday_date,
        name: h.name || h.holiday_name || h.localName
      })).filter((h: any) => h.date && h.name);

      if (normalized.length > 0) {
        updateTempHolidays(normalized);
        alert(`ดึงข้อมูลสำเร็จ: พบวันหยุด ${normalized.length} รายการ`);
      } else {
        alert("ไม่พบข้อมูลวันหยุดที่สามารถประมวลผลได้จาก API นี้ (โปรดตรวจสอบรูปแบบ JSON)");
      }
    } catch (error) {
      console.error("Failed to fetch holidays from Custom API:", error);
      alert("เกิดข้อผิดพลาดในการดึงข้อมูลจาก API: " + (error as Error).message);
    } finally {
      setIsFetchingHolidays(false);
    }
  };

  const updateTempHolidays = (newHolidays: CompanyHoliday[]) => {
    setTempHolidays(prev => {
      const existingDates = new Set(prev.map(h => h.date));
      const uniqueNew = newHolidays.filter(h => !existingDates.has(h.date));
      return [...prev, ...uniqueNew].sort((a, b) => a.date.localeCompare(b.date));
    });
  };

  const handleRemoveEntry = (idOrName: string) => {
    if (settingsTab === 'dept') {
      setTempDepts(tempDepts.filter(d => d !== idOrName));
    } else if (settingsTab === 'pos') {
      setTempPos(tempPos.filter(p => p !== idOrName));
    } else {
      setTempHolidays(tempHolidays.filter(h => h.id !== idOrName));
    }
  };

  const handleApplySettings = () => {
    onSaveSettings(tempDepts, tempPos, tempHolidays);
    setShowSettings(false);
  };

  const handleBalanceChange = (type: LeaveType, value: string) => {
    const numValue = parseInt(value) || 0;
    setFormData(prev => ({
      ...prev,
      balances: {
        ...(prev.balances as LeaveBalance),
        [type]: numValue
      }
    }));
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addAdditionalEmailField = () => {
    setFormData(prev => ({
      ...prev,
      additionalEmails: [...(prev.additionalEmails || []), '']
    }));
  };

  const removeAdditionalEmailField = (index: number) => {
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
    if (formData.nameTh && formData.department && formData.role) {
      const primaryName = formData.nameTh || formData.nameEn || formData.name || 'New Employee';
      const primaryNickname = formData.nicknameTh || formData.nicknameEn || formData.nickname || 'Staff';

      const employeeData: Employee = {
        id: editingEmpId || `user-${Date.now()}`,
        name: primaryName,
        nameTh: formData.nameTh,
        nameEn: formData.nameEn,
        nicknameTh: formData.nicknameTh,
        nicknameEn: formData.nicknameEn,
        nickname: primaryNickname,
        phone: formData.phone,
        email: formData.email,
        additionalEmails: (formData.additionalEmails || []).filter(email => email.trim() !== ''),
        baseLocation: formData.baseLocation,
        avatar: formData.avatar || `https://picsum.photos/seed/${editingEmpId || Date.now()}/100/100`,
        department: formData.department,
        position: formData.position || '',
        role: formData.role as UserRole,
        managerId: formData.managerId || undefined,
        balances: formData.balances as LeaveBalance
      };

      if (editingEmpId) {
        onUpdateEmployee(employeeData);
      } else {
        onAddEmployee(employeeData);
      }
      handleClose();
    }
  };

  const handleEdit = (emp: Employee) => {
    setEditingEmpId(emp.id);
    setFormData({
      name: emp.name,
      nameTh: emp.nameTh || '',
      nameEn: emp.nameEn || '',
      nicknameTh: emp.nicknameTh || '',
      nicknameEn: emp.nicknameEn || '',
      nickname: emp.nickname || '',
      phone: emp.phone || '',
      email: emp.email || '',
      additionalEmails: emp.additionalEmails || [],
      baseLocation: emp.baseLocation || '',
      avatar: emp.avatar || '',
      department: emp.department,
      position: emp.position,
      role: emp.role,
      managerId: emp.managerId || '',
      balances: emp.balances ? { ...emp.balances } : { ...DEFAULT_BALANCES }
    });
    setIsAdding(true);
  };

  const handleOpenResetModal = (emp: Employee) => {
    setResettingUser(emp);
    setTempPassword(generateRandomPassword());
    setIsCopied(false);
    setResetSuccess(false);
  };

  const handleApplyReset = () => {
    if (!resettingUser) return;
    onUpdateEmployee({
      ...resettingUser,
      password: tempPassword
    });
    setResetSuccess(true);
    setTimeout(() => {
      setResettingUser(null);
      setResetSuccess(false);
    }, 2000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleClose = () => {
    setIsAdding(false);
    setEditingEmpId(null);
    setFormData({ 
      name: '', 
      nameTh: '',
      nameEn: '',
      nicknameTh: '',
      nicknameEn: '',
      nickname: '', 
      phone: '', 
      email: '', 
      additionalEmails: [],
      baseLocation: '', 
      avatar: '',
      department: departments[0], 
      position: '', 
      role: 'Employee', 
      managerId: '',
      balances: { ...DEFAULT_BALANCES }
    });
  };

  const getRoleIcon = (role: UserRole) => {
    switch(role) {
      case 'Admin': return <Shield size={14} className="text-rose-500" />;
      case 'Manager': return <Briefcase size={14} className="text-indigo-500" />;
      default: return <User size={14} className="text-slate-500" />;
    }
  };

  const getRoleStyle = (role: UserRole) => {
    switch(role) {
      case 'Admin': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'Manager': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  const hasSettingsChanged = JSON.stringify(tempDepts) !== JSON.stringify(departments) || 
                             JSON.stringify(tempPos) !== JSON.stringify(positions) ||
                             JSON.stringify(tempHolidays) !== JSON.stringify(holidays);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase">User Management</h2>
          <p className="text-slate-500 font-medium mt-2">จัดการสิทธิ์พนักงาน, ข้อมูลโปรไฟล์ และแผนกทั้งหมดในระบบ</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleOpenSettings}
            className="relative z-10 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-black px-6 py-5 rounded-2xl flex items-center gap-3 transition-all active:scale-95 text-sm uppercase tracking-widest"
          >
            <Settings2 size={22} />
            System Settings
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="relative z-10 bg-slate-900 hover:bg-indigo-600 text-white font-black px-10 py-5 rounded-2xl flex items-center gap-3 transition-all shadow-2xl shadow-slate-200 active:scale-95 text-sm uppercase tracking-widest"
          >
            <UserPlus size={22} />
            Add Employee
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center gap-4">
          <div className="flex-1 relative group">
            <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search by name, nickname, position or department..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 font-bold text-sm transition-all"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">พนักงาน (Employee)</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ตำแหน่งและแผนก</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">สายการอนุมัติ (Reporting To)</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredEmployees.map((emp) => {
                const manager = employees.find(e => e.id === emp.managerId);
                return (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-10 py-6">
                      <div 
                        className="flex items-center gap-5 cursor-pointer"
                        onClick={() => onViewProfile?.(emp)}
                      >
                        <img src={emp.avatar} className="w-14 h-14 rounded-2xl border-2 border-white shadow-md ring-4 ring-slate-50 object-cover group-hover:scale-105 transition-transform" alt="" />
                        <div>
                          <div className="font-black text-slate-900 text-base leading-none group-hover:text-indigo-600 transition-colors">
                            {emp.nameTh || emp.name} {emp.nicknameTh && <span className="text-indigo-500 ml-1">({emp.nicknameTh})</span>}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-tight">ID: {emp.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center gap-2 w-fit px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase shadow-sm ${getRoleStyle(emp.role)}`}>
                            {getRoleIcon(emp.role)}
                            {emp.role}
                          </div>
                          <span className="text-xs font-black text-indigo-600">{emp.position || 'No Position'}</span>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{emp.department}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      {manager ? (
                        <div 
                          className="flex items-center gap-3 cursor-pointer group/mgr"
                          onClick={() => onViewProfile?.(manager)}
                        >
                          <img src={manager.avatar} className="w-8 h-8 rounded-lg border border-slate-100 shadow-sm object-cover" alt="" />
                          <div>
                            <div className="text-xs font-black text-slate-700 group-hover/mgr:text-indigo-600 transition-colors">{manager.name}</div>
                            <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter">Direct Approver</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase italic">
                           <X size={12} /> No Direct Approver
                        </div>
                      )}
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                        <button 
                          onClick={() => handleOpenResetModal(emp)}
                          className="p-3 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-2xl transition-all"
                          title="รีเซ็ตรหัสผ่าน"
                        >
                          <Key size={20} />
                        </button>
                        <button 
                          onClick={() => handleEdit(emp)}
                          className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit2 size={20} />
                        </button>
                        <button 
                          onClick={() => setDeletingEmp(emp)}
                          className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                          title="ลบพนักงาน"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: DELETE CONFIRMATION */}
      {deletingEmp && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[130] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center text-rose-500 mx-auto shadow-inner ring-8 ring-rose-50/50">
                <AlertTriangle size={40} className="animate-pulse" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">ยืนยันการลบพนักงาน?</h3>
                <p className="text-sm text-slate-500 font-medium">คุณกำลังจะลบข้อมูลของ <br/><span className="text-rose-600 font-black">{deletingEmp.name}</span> ออกจากระบบอย่างถาวร</p>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    onRemoveEmployee(deletingEmp.id);
                    setDeletingEmp(null);
                  }}
                  className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all active:scale-95"
                >
                  ยืนยันลบพนักงาน
                </button>
                <button 
                  onClick={() => setDeletingEmp(null)}
                  className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SYSTEM SETTINGS */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <Settings2 className="text-indigo-600" size={24} />
                <h3 className="font-black text-slate-900 text-xl uppercase tracking-tight">System Settings</h3>
              </div>
              <button onClick={handleCloseSettings} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full transition-all">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-2 bg-slate-100/50 flex gap-1 m-4 rounded-2xl border border-slate-100">
               <button 
                 onClick={() => setSettingsTab('dept')}
                 className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${settingsTab === 'dept' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <Building2 size={16} /> Depts
               </button>
               <button 
                 onClick={() => setSettingsTab('pos')}
                 className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${settingsTab === 'pos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <BriefcaseIcon size={16} /> Positions
               </button>
               <button 
                 onClick={() => setSettingsTab('hol')}
                 className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${settingsTab === 'hol' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <CalendarDays size={16} /> Holidays
               </button>
            </div>

            <div className="p-8 space-y-6 pt-0 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {settingsTab === 'hol' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <Globe size={12} /> External Holiday API Sync
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="url" 
                          value={customHolidayApiUrl}
                          onChange={(e) => setCustomHolidayApiUrl(e.target.value)}
                          placeholder="วางลิงก์ API วันหยุด (เช่น https://api.example.com/holidays)"
                          className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 font-bold text-[11px]"
                        />
                      </div>
                      <button 
                        onClick={fetchHolidaysFromCustomApi}
                        disabled={isFetchingHolidays}
                        className="px-6 bg-slate-900 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-600 transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {isFetchingHolidays ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Sync
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={fetchThaiHolidaysAI}
                    disabled={isFetchingHolidays}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-50 text-indigo-700 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm disabled:opacity-50"
                  >
                    {isFetchingHolidays ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} className="text-indigo-500" />}
                    {isFetchingHolidays ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูลวันหยุดนักขัตฤกษ์ผ่าน AI'}
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newEntryName}
                    onChange={(e) => setNewEntryName(e.target.value)}
                    placeholder={settingsTab === 'dept' ? "New Department Name..." : settingsTab === 'pos' ? "New Position Title..." : "Holiday Name..."}
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 font-bold text-sm"
                  />
                  {settingsTab === 'hol' && (
                    <input 
                      type="date" 
                      value={newHolidayDate}
                      onChange={(e) => setNewHolidayDate(e.target.value)}
                      className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 font-bold text-sm"
                    />
                  )}
                  <button 
                    onClick={handleAddEntry}
                    className="p-3 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-colors"
                  >
                    <Plus size={24} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {(settingsTab === 'dept' ? tempDepts : settingsTab === 'pos' ? tempPos : tempHolidays).length === 0 && (
                   <div className="py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No entries found</div>
                )}
                {settingsTab === 'hol' ? (
                  tempHolidays.map((h) => (
                    <div key={h.id} className="group flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:bg-white transition-all">
                      <div>
                        <span className="text-xs font-black text-slate-700">{h.name}</span>
                        <span className="text-[10px] text-indigo-500 font-black ml-3 uppercase tracking-tighter">{format(new Date(h.date), 'dd MMM yyyy')}</span>
                      </div>
                      <button 
                        onClick={() => handleRemoveEntry(h.id)}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  (settingsTab === 'dept' ? tempDepts : tempPos).map((item, i) => (
                    <div key={i} className="group flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:bg-white transition-all">
                      <span className="text-xs font-black text-slate-700">{item}</span>
                      <button 
                        onClick={() => handleRemoveEntry(item)}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-4 justify-center">
               <button 
                 onClick={handleCloseSettings} 
                 className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
               >
                 <Ban size={14} /> Cancel
               </button>
               <button 
                 onClick={handleApplySettings}
                 disabled={!hasSettingsChanged}
                 className={`flex-[2] py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${hasSettingsChanged ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
               >
                 <Save size={14} /> Save Changes
               </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD */}
      {resettingUser && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 relative">
            <button 
              onClick={() => setResettingUser(null)}
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
            >
              <X size={24} />
            </button>

            <div className="p-10 text-center space-y-6 pt-16 pb-12">
              <div className="w-24 h-24 bg-amber-50 rounded-[2rem] flex items-center justify-center text-amber-500 mx-auto shadow-inner ring-8 ring-amber-50/50">
                <Key size={48} className={resetSuccess ? "" : "animate-pulse"} />
              </div>
              
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Reset User Password</h3>
                <p className="text-sm text-slate-500 font-medium mt-2">กำลังดำเนินการรีเซ็ตรหัสผ่านให้คุณ <br/><span className="text-indigo-600 font-black">{resettingUser.name}</span></p>
              </div>

              {resetSuccess ? (
                <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 animate-in slide-in-from-top-2">
                  <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-sm uppercase">
                    <CheckCircle2 size={20} /> Password Updated!
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-200 relative group overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Temporary Password</label>
                    <div className="flex items-center justify-center gap-4">
                      <span className="text-3xl font-black text-slate-900 tracking-[0.2em] font-mono">{tempPassword}</span>
                      <div className="flex flex-col gap-1">
                        <button 
                          onClick={() => copyToClipboard(tempPassword)}
                          className={`p-2 rounded-xl transition-all ${isCopied ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 hover:text-indigo-600 shadow-sm border border-slate-100'}`}
                          title="คัดลอก"
                        >
                          {isCopied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                        </button>
                        <button 
                          onClick={() => setTempPassword(generateRandomPassword())}
                          className="p-2 bg-white text-slate-400 hover:text-amber-600 rounded-xl shadow-sm border border-slate-100 transition-all active:rotate-180"
                          title="สุ่มใหม่"
                        >
                          <RefreshCw size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleApplyReset}
                    className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-95"
                  >
                    Confirm & Apply Reset
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT EMPLOYEE */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
                   <UserPlus size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-xl uppercase tracking-tight">
                    {editingEmpId ? 'Modify Profile' : 'Onboard Employee'}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Update personal, corporate and leave entitlements
                  </p>
                </div>
              </div>
              <button onClick={handleClose} className="w-10 h-10 flex items-center justify-center bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
              {/* Identity Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 px-1 text-slate-800">
                  <User size={18} className="text-indigo-600" />
                  <h4 className="font-black text-sm uppercase tracking-widest">ข้อมูลพื้นฐาน (Identity)</h4>
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-8 mb-4">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-[2rem] bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shadow-inner group-hover:border-indigo-400 transition-colors">
                      {formData.avatar ? (
                        <img src={formData.avatar} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <User className="text-slate-300" size={48} />
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleAvatarFileChange} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all hover:scale-110"
                      title="อัปโหลดรูป"
                    >
                      <Camera size={16} />
                    </button>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Real Name TH (ชื่อจริง)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="ชื่อ-นามสกุล (ไทย)"
                        value={formData.nameTh}
                        onChange={e => setFormData({...formData, nameTh: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:ring-4 focus:ring-indigo-100 focus:outline-none font-bold text-sm transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Real Name EN (ชื่อจริง)</label>
                      <input 
                        type="text" 
                        placeholder="Full Name (English)"
                        value={formData.nameEn}
                        onChange={e => setFormData({...formData, nameEn: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:ring-4 focus:ring-indigo-100 focus:outline-none font-bold text-sm transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nickname TH (ชื่อเล่น)</label>
                      <input 
                        type="text" 
                        placeholder="ชื่อเล่น (ไทย)"
                        value={formData.nicknameTh}
                        onChange={e => setFormData({...formData, nicknameTh: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:ring-4 focus:ring-indigo-100 focus:outline-none font-bold text-sm transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nickname EN (ชื่อเล่น)</label>
                      <input 
                        type="text" 
                        placeholder="Nickname (English)"
                        value={formData.nicknameEn}
                        onChange={e => setFormData({...formData, nicknameEn: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:ring-4 focus:ring-indigo-100 focus:outline-none font-bold text-sm transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Position (ตำแหน่ง)</label>
                    <div className="relative">
                      <select 
                        required
                        value={formData.position}
                        onChange={e => setFormData({...formData, position: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:ring-4 focus:ring-indigo-100 outline-none appearance-none font-bold text-sm cursor-pointer transition-all"
                      >
                        <option value="" disabled>Select Position</option>
                        {positions.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Department (แผนก)</label>
                    <div className="relative">
                      <select 
                        value={formData.department}
                        onChange={e => setFormData({...formData, department: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:ring-4 focus:ring-indigo-100 outline-none appearance-none font-bold text-sm cursor-pointer"
                      >
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="divider h-px bg-slate-100"></div>

              {/* Emails Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-1 text-slate-800">
                  <div className="flex items-center gap-2">
                    <Mail size={18} className="text-indigo-600" />
                    <h4 className="font-black text-sm uppercase tracking-widest">ข้อมูลอีเมล (Emails)</h4>
                  </div>
                  <button 
                    type="button" 
                    onClick={addAdditionalEmailField}
                    className="flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all text-[10px] font-black"
                   >
                     <Plus size={12} /> ADD EMAIL
                   </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Email (Login Account)</label>
                    <input 
                      type="email" 
                      required
                      placeholder="name@company.com"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:ring-4 focus:ring-indigo-100 focus:outline-none font-bold text-sm transition-all"
                    />
                  </div>

                  {formData.additionalEmails?.map((email, index) => (
                    <div key={index} className="space-y-2 animate-in slide-in-from-top-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                        Additional Email #{index + 1}
                        <button type="button" onClick={() => removeAdditionalEmailField(index)} className="text-rose-500 hover:text-rose-700"><Trash2 size={12} /></button>
                      </label>
                      <input 
                        type="email" 
                        placeholder="other@example.com"
                        value={email}
                        onChange={e => handleAdditionalEmailChange(index, e.target.value)}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:ring-4 focus:ring-indigo-100 focus:outline-none font-bold text-sm transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="divider h-px bg-slate-100"></div>

              {/* Contact and Corporate */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <input 
                    type="tel" 
                    placeholder="081-XXX-XXXX"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:ring-4 focus:ring-indigo-100 focus:outline-none font-bold text-sm transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Base Location</label>
                  <div className="relative">
                    <select 
                      value={formData.baseLocation}
                      onChange={e => setFormData({...formData, baseLocation: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:ring-4 focus:ring-indigo-100 outline-none appearance-none font-bold text-sm cursor-pointer"
                    >
                      <option value="">Select Location</option>
                      <option value="HAND SE (Thonglor)">HAND SE (Thonglor)</option>
                      <option value="KRAC (Chulalongkorn University)">KRAC (Chulalongkorn University)</option>
                    </select>
                    <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="divider h-px bg-slate-100"></div>

              {/* Role and Approval Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Role (บทบาท)</label>
                  <div className="relative">
                    <select 
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:ring-4 focus:ring-indigo-100 outline-none appearance-none font-bold text-sm cursor-pointer"
                    >
                      <option value="Employee">Employee (ทั่วไป)</option>
                      <option value="Manager">Manager (หัวหน้างาน)</option>
                      <option value="Admin">Admin (แอดมินระบบ)</option>
                    </select>
                    <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">สายการอนุมัติ (Reporting To)</label>
                  <div className="relative">
                    <select 
                      value={formData.managerId}
                      onChange={e => setFormData({...formData, managerId: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] outline-none appearance-none font-bold text-sm cursor-pointer focus:ring-4 focus:ring-indigo-100 transition-all"
                    >
                      <option value="">- No Direct Approver -</option>
                      {potentialApprovers
                        .filter(e => e.id !== editingEmpId)
                        .map(e => (
                        <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                      ))}
                    </select>
                    <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="divider h-px bg-slate-100"></div>

              {/* Leave Policy Settings (Individual) */}
              <div className="space-y-6 pt-2">
                <div className="flex items-center gap-2 px-1 text-slate-800">
                  <ScrollText size={18} className="text-indigo-600" />
                  <h4 className="font-black text-sm uppercase tracking-widest">สิทธิ์การลาเฉพาะบุคคล (Leave Entitlements)</h4>
                </div>
                
                <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 shadow-inner grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                  {Object.values(LeaveType).map((type) => (
                    <div key={type} className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block ml-1 truncate" title={type}>
                        {type}
                      </label>
                      <div className="relative">
                        <input 
                          type="number"
                          min="0"
                          max="365"
                          value={formData.balances?.[type] || 0}
                          onChange={(e) => handleBalanceChange(type, e.target.value)}
                          className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-none font-black text-sm text-indigo-600 transition-all"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 uppercase">Days</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-6 border-t border-slate-100 flex gap-4">
                <button 
                  type="button" 
                  onClick={handleClose}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-5 rounded-[1.5rem] transition-all uppercase tracking-widest text-xs"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-indigo-100 transition-all uppercase tracking-widest text-xs active:scale-95"
                >
                  {editingEmpId ? 'Update & Save Profile' : 'Register & Assign Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};