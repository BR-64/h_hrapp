import React, { useState, useMemo, useRef } from 'react';
import { Employee, LeaveRequest, LeaveStatus, LeaveType, LeaveDuration } from '../types';
import { 
  ClipboardList, Plus, Clock, CheckCircle, XCircle, Send, 
  Calendar as CalendarIcon, FileText, Paperclip, Users, Info, 
  AlertCircle, ChevronRight, Search, PlusCircle, Trash2, 
  Filter, Eye, Edit3, X, Download, Ban, ChevronDown, 
  CalendarDays, FileCheck, History, ChevronLeft, RotateCcw,
  LayoutGrid, Star, CalendarRange, Camera, Image as ImageIcon, File, ShieldCheck
} from 'lucide-react';
import { 
  format, 
  differenceInCalendarDays, 
  isValid, 
  isWithinInterval, 
  endOfMonth, 
  endOfYear,
  endOfWeek,
  addDays,
  addWeeks,
  addMonths,
  isSameDay,
  isAfter,
  isBefore
} from 'date-fns';

// Fix: Local implementations for missing date-fns members
const parseISO = (dateStr: string) => new Date(dateStr);
const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};
const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);
const startOfYear = (date: Date): Date => new Date(date.getFullYear(), 0, 1);
const startOfWeek = (date: Date, options?: { weekStartsOn?: number }): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const weekStartsOn = options?.weekStartsOn ?? 0;
  const diff = d.getDate() - (day < weekStartsOn ? 7 : 0) - (day - weekStartsOn);
  const result = new Date(d.setDate(diff));
  result.setHours(0, 0, 0, 0);
  return result;
};

interface LeavePanelProps {
  employees: Employee[];
  currentUser: Employee;
  requests: LeaveRequest[];
  onAction: (id: string, action: LeaveStatus) => void;
  onAddLeave: (req: LeaveRequest) => void;
  onViewProfile?: (user: Employee) => void;
}

type HistoryPeriod = 'day' | 'week' | 'month';

// Translation and Icon Mapping
const LEAVE_META: Record<LeaveType, { thai: string, icon: string, color: string, accent: string }> = {
  [LeaveType.SICK]: { thai: 'ลาป่วย', icon: '🤒', color: 'bg-rose-50 text-rose-600', accent: 'rose' },
  [LeaveType.ANNUAL]: { thai: 'ลาพักร้อน', icon: '🏖️', color: 'bg-emerald-50 text-emerald-600', accent: 'emerald' },
  [LeaveType.PERSONAL]: { thai: 'ลากิจ', icon: '🏠', color: 'bg-amber-50 text-amber-600', accent: 'amber' },
  [LeaveType.COMPENSATION]: { thai: 'ชดเชยทำงานวันหยุด', icon: '⏳', color: 'bg-blue-50 text-blue-600', accent: 'blue' },
  [LeaveType.MATERNITY_1]: { thai: 'ลาคลอด 60 วันแรก', icon: '🤰', color: 'bg-pink-50 text-pink-600', accent: 'pink' },
  [LeaveType.MATERNITY_2]: { thai: 'ลาคลอด 60 วันหลัง', icon: '👶', color: 'bg-purple-50 text-purple-600', accent: 'purple' },
  [LeaveType.TRAINING]: { thai: 'ลาฝึกอบรม', icon: '📚', color: 'bg-indigo-50 text-indigo-600', accent: 'indigo' },
  [LeaveType.STERILIZATION]: { thai: 'ลาทำหมัน', icon: '🏥', color: 'bg-slate-50 text-slate-600', accent: 'slate' },
  [LeaveType.ORDINATION]: { thai: 'ลาบวช', icon: '🙏', color: 'bg-orange-50 text-orange-600', accent: 'orange' },
  [LeaveType.UNPAID]: { thai: 'ลาไม่รับค่าจ้าง', icon: '💸', color: 'bg-slate-100 text-slate-500', accent: 'slate' },
  [LeaveType.CHILD_CARE]: { thai: 'ลาดูแลบุตรป่วย', icon: '🍼', color: 'bg-cyan-50 text-cyan-600', accent: 'cyan' },
};

export const LeavePanel: React.FC<LeavePanelProps> = ({ employees, currentUser, requests, onAction, onAddLeave, onViewProfile }) => {
  // Modal & Form States
  const [isAdding, setIsAdding] = useState(false);
  const [viewDetail, setViewDetail] = useState<LeaveRequest | null>(null);
  const [newLeave, setNewLeave] = useState({
    type: LeaveType.ANNUAL,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    duration: LeaveDuration.FULL_DAY,
    reason: '',
    attachmentName: '',
    attachmentData: '',
    ccTo: [] as string[]
  });
  
  // Filtering States for My Requests
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterPeriod, setFilterPeriod] = useState<string>('All');

  // History States for Manager
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>('month');
  const [historyAnchorDate, setHistoryAnchorDate] = useState(new Date());

  const myRequests = requests.filter(r => r.employeeId === currentUser.id);
  
  const teamRequests = useMemo(() => {
    if (currentUser.role === 'Admin') {
      return requests.filter(r => r.employeeId !== currentUser.id);
    }
    return requests.filter(r => {
      const isNotMe = r.employeeId !== currentUser.id;
      const emp = employees.find(e => e.id === r.employeeId);
      const isMySubordinate = emp?.managerId === currentUser.id;
      return isNotMe && isMySubordinate;
    });
  }, [requests, currentUser.id, currentUser.role, employees]);
  
  const canApprove = currentUser.role === 'Manager' || currentUser.role === 'Admin';
  
  const designatedManager = employees.find(e => e.id === currentUser.managerId);
  const systemAdminApprover = employees.find(e => e.role === 'Admin');
  const activeApprover = designatedManager || systemAdminApprover;

  // Validation for overlapping dates
  const isDateAlreadyRequested = useMemo(() => {
    try {
      const start = startOfDay(parseISO(newLeave.startDate));
      const end = startOfDay(parseISO(newLeave.endDate));
      
      return myRequests.some(req => {
        if (req.status === LeaveStatus.CANCELLED || req.status === LeaveStatus.REJECTED) return false;
        const reqStart = startOfDay(parseISO(req.startDate));
        const reqEnd = startOfDay(parseISO(req.endDate));
        return (start <= reqEnd && end >= reqStart);
      });
    } catch {
      return false;
    }
  }, [newLeave.startDate, newLeave.endDate, myRequests]);

  // Logic: Subtract both Pending and Approved from Entitlement
  const getDetailedBalance = (type: LeaveType) => {
    const entitlement = currentUser.balances ? currentUser.balances[type] : 0;
    const approved = myRequests
      .filter(r => r.type === type && r.status === LeaveStatus.APPROVED)
      .reduce((sum, r) => sum + r.totalDays, 0);
    const pending = myRequests
      .filter(r => r.type === type && r.status === LeaveStatus.PENDING)
      .reduce((sum, r) => sum + r.totalDays, 0);
    
    return {
      entitlement,
      approved,
      pending,
      remaining: Math.max(0, entitlement - approved - pending)
    };
  };

  const totalDays = useMemo(() => {
    if (newLeave.duration !== LeaveDuration.FULL_DAY) return 0.5;
    try {
      const start = parseISO(newLeave.startDate);
      const end = parseISO(newLeave.endDate);
      if (!isValid(start) || !isValid(end)) return 0;
      const diff = differenceInCalendarDays(end, start) + 1;
      return diff > 0 ? diff : 0;
    } catch {
      return 0;
    }
  }, [newLeave.startDate, newLeave.endDate, newLeave.duration]);

  const currentTypeBalance = getDetailedBalance(newLeave.type);
  const isBalanceInsufficient = totalDays > currentTypeBalance.remaining;

  const filteredMyRequests = useMemo(() => {
    return myRequests.filter(req => {
      const statusMatch = filterStatus === 'All' || req.status === filterStatus;
      const typeMatch = filterType === 'All' || req.type === filterType;
      
      let periodMatch = true;
      const reqDate = parseISO(req.startDate);
      const now = new Date();
      if (filterPeriod === 'Month') {
        periodMatch = isWithinInterval(reqDate, { start: startOfMonth(now), end: endOfMonth(now) });
      } else if (filterPeriod === 'Year') {
        periodMatch = isWithinInterval(reqDate, { start: startOfYear(now), end: endOfYear(now) });
      }
      
      return statusMatch && typeMatch && periodMatch;
    }).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [myRequests, filterStatus, filterType, filterPeriod]);

  const filteredHistory = useMemo(() => {
    const anchor = startOfDay(historyAnchorDate);
    let start: Date;
    let end: Date;

    switch (historyPeriod) {
      case 'day': start = anchor; end = anchor; break;
      case 'week': start = startOfWeek(anchor, { weekStartsOn: 1 }); end = endOfWeek(anchor, { weekStartsOn: 1 }); break;
      case 'month': start = startOfMonth(anchor); end = endOfMonth(anchor); break;
      default: start = anchor; end = anchor;
    }

    return teamRequests.filter(req => {
      if (req.status === LeaveStatus.PENDING) return false;
      const reqDate = startOfDay(parseISO(req.startDate));
      return (isAfter(reqDate, start) || isSameDay(reqDate, start)) && 
             (isBefore(reqDate, end) || isSameDay(reqDate, end));
    }).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [teamRequests, historyPeriod, historyAnchorDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBalanceInsufficient || isDateAlreadyRequested) return;
    
    const req: LeaveRequest = {
      id: `leave-${Date.now()}`,
      employeeId: currentUser.id,
      type: newLeave.type,
      startDate: newLeave.startDate,
      endDate: newLeave.endDate,
      duration: newLeave.duration,
      totalDays,
      reason: newLeave.reason,
      status: LeaveStatus.PENDING,
      timestamp: new Date().toISOString(),
      attachmentName: newLeave.attachmentName,
      attachmentData: newLeave.attachmentData,
      ccTo: newLeave.ccTo
    };
    onAddLeave(req);
    setIsAdding(false);
    resetForm();
  };

  const resetForm = () => {
    setNewLeave({
      type: LeaveType.ANNUAL,
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      duration: LeaveDuration.FULL_DAY,
      reason: '',
      attachmentName: '',
      attachmentData: '',
      ccTo: []
    });
  };

  const getStatusColor = (status: LeaveStatus) => {
    switch (status) {
      case LeaveStatus.APPROVED: return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case LeaveStatus.REJECTED: return 'bg-rose-50 text-rose-700 border-rose-100';
      case LeaveStatus.CANCELLED: return 'bg-slate-100 text-slate-500 border-slate-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-100';
    }
  };

  const getStatusIcon = (status: LeaveStatus) => {
    switch (status) {
      case LeaveStatus.APPROVED: return <CheckCircle size={14} />;
      case LeaveStatus.REJECTED: return <XCircle size={14} />;
      case LeaveStatus.CANCELLED: return <Ban size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const mainLeaveTypes = [LeaveType.ANNUAL, LeaveType.SICK, LeaveType.PERSONAL];

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-20">
      {/* Header Area */}
      <div className="bg-white p-8 lg:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm animate-in slide-in-from-top-4 duration-500 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -mr-32 -mt-32 blur-3xl -z-10"></div>
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-100 ring-8 ring-indigo-50 transition-transform hover:rotate-3">
             <FileCheck size={40} />
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase leading-none">การลา<br/><span className="text-indigo-600 text-2xl font-bold tracking-normal normal-case">Leave Requests</span></h2>
            <p className="text-slate-500 font-medium mt-2">ยื่นคำขอลาพักผ่อนและตรวจสอบสถิติวันคงเหลือ</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full md:w-auto flex items-center justify-center gap-3 px-10 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-sm shadow-2xl shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-95 group whitespace-nowrap"
        >
          <Plus size={24} className="group-hover:rotate-90 transition-transform" />
          APPLY NEW LEAVE
        </button>
      </div>

      {/* Leave Balances Grid */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
           <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <LayoutGrid size={20} />
           </div>
           <div>
             <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">สถิติวันลาคงเหลือ (Live Balances)</h3>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">หักลบจำนวนวันลาทันทีเมื่อยื่นคำขอ (หักออกทั้งสถานะอนุมัติและรออนุมัติ)</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mainLeaveTypes.map(type => {
            const detail = getDetailedBalance(type);
            return (
              <div key={type} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden transition-all hover:shadow-xl hover:shadow-indigo-50 group border-b-4 border-b-transparent hover:border-b-indigo-500">
                <div className="p-6 flex items-center gap-6">
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-sm ${LEAVE_META[type].color} group-hover:scale-110 transition-transform`}>
                    {LEAVE_META[type].icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{type}</span>
                      <span className="text-lg font-black text-slate-900 leading-tight">{LEAVE_META[type].thai}</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-4xl font-black text-indigo-600">{detail.remaining}</span>
                      <span className="text-xs font-bold text-slate-400 uppercase">Days Left</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Approved (อนุมัติแล้ว)</span>
                    </div>
                    <span className="text-sm font-black text-slate-700">{detail.approved} <span className="text-[10px] font-bold text-slate-400">Days</span></span>
                  </div>
                  <div className="flex flex-col border-l border-slate-200 pl-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Pending (รออนุมัติ)</span>
                    </div>
                    <span className="text-sm font-black text-slate-700">{detail.pending} <span className="text-[10px] font-bold text-slate-400">Days</span></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-8 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-50/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-indigo-600">
              <ClipboardList size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">ประวัติการลาของฉัน</h3>
              <p className="text-xs font-bold text-slate-400 uppercase">รายการขอลาทั้งหมดและการหักลบวันลาอัตโนมัติ</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
              <Filter size={14} className="text-slate-400" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-transparent text-[10px] font-black uppercase outline-none cursor-pointer">
                <option value="All">All Status</option>
                {Object.values(LeaveStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Applied</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type (EN/TH)</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Period</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Duration</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMyRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-400 uppercase font-black text-xs">No matching leave requests found</td>
                </tr>
              ) : (
                filteredMyRequests.map(req => (
                  <tr key={req.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 text-xs font-bold text-slate-500">{format(new Date(req.timestamp), 'dd/MM/yyyy')}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{LEAVE_META[req.type].icon}</span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-black text-slate-800 uppercase truncate">{req.type}</span>
                          <span className="text-[10px] font-bold text-indigo-400 uppercase truncate">{LEAVE_META[req.type].thai}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-black text-slate-700">
                        {format(new Date(req.startDate), 'dd/MM/yyyy')} {req.totalDays > 1 && `- ${format(new Date(req.endDate), 'dd/MM/yyyy')}`}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className="px-3 py-1 bg-slate-100 text-[10px] font-black text-slate-600 rounded-lg">{req.totalDays} Days</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`flex items-center gap-1.5 w-fit px-3 py-1.5 rounded-full text-[9px] font-black uppercase border shadow-sm ${getStatusColor(req.status)}`}>
                        {getStatusIcon(req.status)} {req.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setViewDetail(req)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Eye size={18} /></button>
                        {req.status === LeaveStatus.PENDING && (
                          <button onClick={() => onAction(req.id, LeaveStatus.CANCELLED)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><X size={18} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {canApprove && (
        <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-[1.25rem] shadow-sm"><Clock size={24} /></div>
              <div>
                <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Pending Approvals</h3>
                <p className="text-xs font-bold text-slate-400 uppercase">Review and respond to pending leave requests from your subordinates</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamRequests.filter(r => r.status === LeaveStatus.PENDING).length === 0 ? (
                <div className="col-span-full bg-white p-20 rounded-[2.5rem] border border-dashed border-slate-200 text-center flex flex-col items-center">
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4 shadow-inner"><CheckCircle size={40} /></div>
                  <h4 className="text-xl font-black text-slate-900 mb-1">Queue is Empty</h4>
                  <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No pending items to review at the moment</p>
                </div>
              ) : (
                teamRequests.filter(r => r.status === LeaveStatus.PENDING).map(req => {
                  const emp = employees.find(e => e.id === req.employeeId);
                  return (
                    <div key={req.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all group animate-in fade-in flex flex-col relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400"></div>
                      <div className="flex items-center gap-4 mb-6 cursor-pointer" onClick={() => emp && onViewProfile?.(emp)}>
                        <img src={emp?.avatar} className="w-14 h-14 rounded-3xl border-2 border-slate-50 shadow-sm" alt="" />
                        <div className="flex-1 min-w-0">
                          <div className="font-black text-slate-900 text-base flex items-center gap-2 truncate">{emp?.name}</div>
                          <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{emp?.department}</div>
                        </div>
                      </div>
                      <div className="space-y-4 mb-8">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Leave Type</span>
                          <span className="flex flex-col items-end">
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[10px] font-black uppercase">
                              {LEAVE_META[req.type].icon} {req.type}
                            </span>
                            <span className="text-[8px] font-bold text-indigo-400 uppercase mt-1">{LEAVE_META[req.type].thai}</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Applied On (ยื่นเมื่อ)</span>
                          <span className="text-xs font-black text-slate-700">{format(new Date(req.timestamp), 'dd/MM/yyyy HH:mm')}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Period (ระยะเวลา)</span>
                          <span className="text-xs font-black text-slate-700">
                            {format(new Date(req.startDate), 'dd/MM/yyyy')} 
                            {req.startDate !== req.endDate ? ` - ${format(new Date(req.endDate), 'dd/MM/yyyy')}` : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Days (รวม)</span>
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-black text-slate-600">{req.totalDays} Days</span>
                        </div>
                      </div>
                      <div className="bg-slate-50/80 p-5 rounded-[1.5rem] border border-slate-100/50 mb-8 flex-1">
                        <p className="text-xs text-slate-600 italic font-medium leading-relaxed">"{req.reason}"</p>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => onAction(req.id, LeaveStatus.APPROVED)} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg transition-all active:scale-95"><CheckCircle size={16} /> Approve</button>
                        <button onClick={() => onAction(req.id, LeaveStatus.REJECTED)} className="flex-1 py-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-rose-100 transition-all active:scale-95"><XCircle size={16} /> Reject</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 text-indigo-700 rounded-[1.25rem] shadow-sm"><History size={24} /></div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">ประวัติการดำเนินการ (History)</h3>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Period</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type (EN/TH)</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Duration</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Processed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredHistory.length === 0 ? (
                      <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-400 uppercase font-black text-xs">No history found for this period</td></tr>
                    ) : (
                      filteredHistory.map(req => {
                        const emp = employees.find(e => e.id === req.employeeId);
                        return (
                          <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-3 cursor-pointer" onClick={() => emp && onViewProfile?.(emp)}>
                                <img src={emp?.avatar} className="w-8 h-8 rounded-full border border-slate-200" alt="" />
                                <div className="text-xs font-black text-slate-800">{emp?.name}</div>
                              </div>
                            </td>
                            <td className="px-8 py-5 text-xs font-bold text-slate-500">{format(new Date(req.startDate), 'dd/MM/yyyy')}</td>
                            <td className="px-8 py-5">
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-700 uppercase leading-none">{req.type}</span>
                                <span className="text-[9px] font-bold text-indigo-400 uppercase mt-0.5">{LEAVE_META[req.type].thai}</span>
                              </div>
                            </td>
                            <td className="px-8 py-5 text-center"><span className="text-xs font-bold text-slate-500">{req.totalDays} Days</span></td>
                            <td className="px-8 py-5"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${getStatusColor(req.status)}`}>{req.status}</span></td>
                            <td className="px-8 py-5 text-right text-[10px] font-bold text-slate-400">{format(new Date(req.timestamp), 'dd/MM/yyyy HH:mm')}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200"><Send size={24} /></div>
                <div>
                  <h3 className="font-black text-slate-900 text-xl uppercase tracking-tight">Apply for Leave</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">แบบฟอร์มยื่นคำขอลาออนไลน์ (All Types)</p>
                </div>
              </div>
              <button onClick={() => setIsAdding(false)} className="w-10 h-10 flex items-center justify-center bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-all active:scale-90">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
              {isDateAlreadyRequested && (
                <div className="bg-rose-50 border-2 border-rose-200 p-6 rounded-3xl flex items-start gap-4 animate-in shake duration-500">
                  <div className="p-2 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-100"><AlertCircle size={24} /></div>
                  <div className="flex-1">
                    <h4 className="text-rose-900 font-black text-sm uppercase">พบรายการลาทับซ้อน (Overlap Detected)</h4>
                    <p className="text-rose-600 text-[11px] font-medium leading-relaxed mt-1">คุณได้ยื่นคำขอลาในช่วงวันที่เลือกไว้แล้ว โปรดยกเลิกคำขอเดิมก่อนหากต้องการยื่นใหม่</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Select Leave Type</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl z-10">{LEAVE_META[newLeave.type].icon}</div>
                      <select value={newLeave.type} onChange={e => setNewLeave({ ...newLeave, type: e.target.value as LeaveType })} className="w-full pl-14 pr-10 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:outline-none font-bold text-xs appearance-none cursor-pointer hover:border-slate-300 transition-all relative z-0">
                        {Object.values(LeaveType).map(type => <option key={type} value={type}>{type} ({LEAVE_META[type].thai})</option>)}
                      </select>
                      <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors z-10" />
                    </div>
                 </div>
                 <div className="bg-slate-50 rounded-[2.5rem] p-6 border border-slate-100 flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500/20"></div>
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Available</span>
                            <div className="text-3xl font-black text-slate-900">{currentTypeBalance.remaining}</div>
                            <span className="text-[8px] font-bold text-slate-500 uppercase">Days Left</span>
                        </div>
                        <div className="flex flex-col items-center border-l border-slate-200">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Requested</span>
                            <div className={`text-3xl font-black ${isBalanceInsufficient ? 'text-rose-500' : 'text-indigo-600'}`}>{totalDays}</div>
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tight">Days Selected</span>
                        </div>
                    </div>
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Start Date</label>
                      <input type="date" value={newLeave.startDate} onChange={e => setNewLeave({ ...newLeave, startDate: e.target.value, endDate: e.target.value > newLeave.endDate ? e.target.value : newLeave.endDate })} className={`w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs ${isDateAlreadyRequested ? 'border-rose-300 ring-rose-50' : ''}`} />
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">End Date</label>
                      <input type="date" value={newLeave.endDate} min={newLeave.startDate} onChange={e => setNewLeave({ ...newLeave, endDate: e.target.value })} className={`w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs ${isDateAlreadyRequested ? 'border-rose-300 ring-rose-50' : ''}`} />
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">Reason for Absence & Attachments</label>
                    <textarea required placeholder="Please specify reason... *" value={newLeave.reason} onChange={e => setNewLeave({ ...newLeave, reason: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] focus:ring-2 focus:ring-indigo-100 focus:outline-none font-medium text-xs min-h-[140px] leading-relaxed" />
                 </div>
                 <div className="space-y-4">
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-[2rem] relative overflow-hidden group">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 block">
                          {designatedManager ? 'Direct Manager (Approver)' : 'Default Approver (System Admin)'}
                       </label>
                       <div className="flex items-center gap-4">
                          <div className="relative">
                            <img src={activeApprover?.avatar} className="w-12 h-12 rounded-[1.25rem] shadow-sm border border-white ring-4 ring-white" alt="" />
                            {!designatedManager && <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-1 rounded-full border-2 border-white"><ShieldCheck size={10} /></div>}
                          </div>
                          <div>
                             <div className="text-sm font-black text-slate-900">{activeApprover?.name}</div>
                             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {designatedManager ? `${activeApprover?.department} Manager` : 'System Administrator'}
                             </div>
                          </div>
                       </div>
                       {!designatedManager && (
                         <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                            <p className="text-[9px] font-bold text-amber-700 leading-tight flex items-center gap-1.5">
                               <Info size={12} /> คุณยังไม่มีการตั้งค่าหัวหน้างาน คำขอนี้จะถูกตรวจสอบโดย Admin อัตโนมัติ
                            </p>
                         </div>
                       )}
                    </div>
                 </div>
              </div>

              <div className="pt-8 border-t border-slate-100">
                <button type="submit" disabled={isBalanceInsufficient || isDateAlreadyRequested || !newLeave.reason.trim() || totalDays === 0} className={`w-full font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 shadow-xl transition-all uppercase tracking-widest text-sm ${(isBalanceInsufficient || isDateAlreadyRequested || !newLeave.reason.trim() || totalDays === 0) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 hover:scale-[1.01] active:scale-[0.98]'}`}><Send size={18} /> SUBMIT APPLICATION</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewDetail && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-8 border-b border-slate-100 flex justify-between items-center"><h3 className="font-black text-slate-900 text-xl uppercase tracking-tight">Leave Record Details</h3><button onClick={() => setViewDetail(null)} className="p-2 hover:bg-slate-100 rounded-full transition-all">✕</button></div>
             <div className="p-8 space-y-6">
                <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                   <div className="flex items-center gap-4">
                      <div className="text-4xl">{LEAVE_META[viewDetail.type].icon}</div>
                      <div className="min-w-0">
                         <div className="text-sm font-black text-slate-900 leading-tight uppercase truncate">{viewDetail.type}</div>
                         <div className="text-[10px] font-bold text-indigo-500 uppercase truncate">{LEAVE_META[viewDetail.type].thai}</div>
                         <div className={`text-[10px] font-black uppercase ${getStatusColor(viewDetail.status)} px-3 py-1 rounded-full border w-fit mt-2`}>{viewDetail.status}</div>
                      </div>
                   </div>
                   <div className="text-right"><div className="text-4xl font-black text-slate-900">{viewDetail.totalDays}</div><div className="text-[10px] font-bold text-slate-400 uppercase">Days total</div></div>
                </div>
                <div className="space-y-2">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason Given</label>
                   <p className="text-xs font-medium text-slate-600 bg-indigo-50/20 p-5 rounded-[1.5rem] border border-indigo-100/50 leading-relaxed italic">"{viewDetail.reason}"</p>
                </div>
                <div className="flex gap-3 pt-4"><button onClick={() => setViewDetail(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-[1.5rem] font-black text-xs uppercase tracking-widest">Close Record</button></div>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};