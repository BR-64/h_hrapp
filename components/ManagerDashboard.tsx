import React, { useMemo, useState } from 'react';
import { WorkLog, Employee, LocationType, LeaveRequest, LeaveStatus, LeaveDuration, CompanyHoliday } from '../types';
import { TYPE_COLORS, isWorkingDay as baseIsWorkingDay } from '../constants';
import { exportToExcel } from '../utils';
import { 
  Users, 
  UserX, 
  MapPin, 
  Building2, 
  Home, 
  Calendar, 
  Clock, 
  AlertCircle, 
  Download, 
  FileSpreadsheet, 
  Filter,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Plane,
  CheckCircle2,
  Timer
} from 'lucide-react';
import { 
  format, 
  isWithinInterval, 
  eachDayOfInterval,
  addMonths,
  endOfMonth,
  addDays,
  addWeeks,
  isAfter,
  isBefore,
  isSameDay
} from 'date-fns';

// Fix: Local implementation for missing date-fns parseISO
const parseISO = (dateStr: string) => new Date(dateStr);

// Helper to calculate hours per log
const calculateLogHours = (log: WorkLog): number => {
  if (!log.startTime || !log.endTime) return 8;
  const [sH, sM] = log.startTime.split(':').map(Number);
  const [eH, eM] = log.endTime.split(':').map(Number);
  return Math.max(0, (eH * 60 + eM - (sH * 60 + sM)) / 60);
};

// Local implementation of startOfDay
const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Local implementation of startOfMonth
const startOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

// Local implementation of startOfWeek
const startOfWeek = (date: Date, options?: { weekStartsOn?: number }): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const weekStartsOn = options?.weekStartsOn ?? 0;
  const diff = d.getDate() - (day < weekStartsOn ? 7 : 0) - (day - weekStartsOn);
  const result = new Date(d.setDate(diff));
  result.setHours(0, 0, 0, 0);
  return result;
};

// Local implementation of endOfWeek
const endOfWeek = (date: Date, options?: { weekStartsOn?: number }): Date => {
  const start = startOfWeek(date, options);
  const result = new Date(start);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
};

interface ManagerDashboardProps {
  logs: WorkLog[];
  employees: Employee[];
  departments: string[];
  leaveRequests?: LeaveRequest[];
  holidays: CompanyHoliday[];
  onViewProfile?: (user: Employee) => void;
}

type Period = 'day' | 'week' | 'month';

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ logs, employees, departments, leaveRequests = [], holidays, onViewProfile }) => {
  const [period, setPeriod] = useState<Period>('day');
  const [anchorDate, setAnchorDate] = useState(new Date());
  
  // Export Report State
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reportDept, setReportDept] = useState('All');

  const today = startOfDay(new Date());
  
  const currentInterval = useMemo(() => {
    const start = startOfDay(anchorDate);
    switch (period) {
      case 'day':
        return { start, end: start };
      case 'week':
        return { start: startOfWeek(start, { weekStartsOn: 1 }), end: endOfWeek(start, { weekStartsOn: 1 }) };
      case 'month':
        return { start: startOfMonth(start), end: endOfMonth(start) };
      default:
        return { start, end: start };
    }
  }, [period, anchorDate]);

  const dateLabel = useMemo(() => {
    switch (period) {
      case 'day':
        return format(currentInterval.start, 'EEEE, d MMM yyyy');
      case 'week':
        return `${format(currentInterval.start, 'd MMM')} - ${format(currentInterval.end, 'd MMM yyyy')}`;
      case 'month':
        return format(currentInterval.start, 'MMMM yyyy');
      default:
        return '';
    }
  }, [period, currentInterval]);

  const stats = useMemo(() => {
    const periodLogs = logs.filter(l => {
      const logDate = startOfDay(new Date(l.date));
      return isWithinInterval(logDate, currentInterval);
    });

    const wfhHours = periodLogs.filter(l => l.type === LocationType.WFH).reduce((sum, l) => sum + calculateLogHours(l), 0);
    const officeHours = periodLogs.filter(l => l.type === LocationType.OFFICE_HANDSE || l.type === LocationType.OFFICE_KRAC).reduce((sum, l) => sum + calculateLogHours(l), 0);
    const offsiteHours = periodLogs.filter(l => l.type === LocationType.OFFSITE).reduce((sum, l) => sum + calculateLogHours(l), 0);
    
    const wfhDays = parseFloat((wfhHours / 8).toFixed(1));
    const officeDays = parseFloat((officeHours / 8).toFixed(1));
    const offsiteDays = parseFloat((offsiteHours / 8).toFixed(1));

    let leaveApprovedDays = 0;
    let leavePendingDays = 0;
    
    leaveRequests.forEach(req => {
      if (req.status !== LeaveStatus.PENDING && req.status !== LeaveStatus.APPROVED) return;
      
      const start = startOfDay(parseISO(req.startDate));
      const end = startOfDay(parseISO(req.endDate));
      
      const intervalStart = currentInterval.start;
      const intervalEnd = currentInterval.end;
      
      const overlapStart = isAfter(start, intervalStart) ? start : intervalStart;
      const overlapEnd = isBefore(end, intervalEnd) ? end : intervalEnd;
      
      if (!isAfter(overlapStart, overlapEnd)) {
        const days = eachDayOfInterval({ start: overlapStart, end: overlapEnd })
          .filter(d => baseIsWorkingDay(d, holidays)).length;
        
        let count = 0;
        if (req.duration !== LeaveDuration.FULL_DAY && days === 1) {
          count = 0.5;
        } else {
          count = days;
        }

        if (req.status === LeaveStatus.APPROVED) {
          leaveApprovedDays += count;
        } else {
          leavePendingDays += count;
        }
      }
    });

    const workingDaysCount = eachDayOfInterval(currentInterval).filter(d => baseIsWorkingDay(d, holidays)).length;
    const totalPotentialHours = workingDaysCount * employees.length * 8;
    const actualHoursFilled = wfhHours + officeHours + offsiteHours + (leaveApprovedDays * 8) + (leavePendingDays * 8);
    const missingHours = Math.max(0, totalPotentialHours - actualHoursFilled);
    const missingDays = parseFloat((missingHours / 8).toFixed(1));

    return { 
      wfh: wfhDays, 
      office: officeDays, 
      offsite: offsiteDays, 
      leaveApproved: leaveApprovedDays,
      leavePending: leavePendingDays,
      missing: missingDays,
      totalHours: actualHoursFilled 
    };
  }, [logs, currentInterval, employees, leaveRequests, holidays]);

  const missingCheckIns = useMemo(() => {
    const monthStart = startOfMonth(today);
    const workingDays = eachDayOfInterval({ start: monthStart, end: today })
      .filter(d => baseIsWorkingDay(d, holidays));

    return employees.map(emp => {
      const empLogs = logs.filter(l => l.employeeId === emp.id);
      const logDates = new Set(empLogs.map(l => l.date));
      
      const empLeaves = leaveRequests.filter(req => 
        req.employeeId === emp.id && 
        (req.status === LeaveStatus.PENDING || req.status === LeaveStatus.APPROVED)
      );

      const missingDates = workingDays
        .map(d => format(d, 'yyyy-MM-dd'))
        .filter(dateStr => {
          const isLogged = logDates.has(dateStr);
          if (isLogged) return false;
          
          const d = parseISO(dateStr);
          const isOnLeave = empLeaves.some(req => {
            const start = startOfDay(parseISO(req.startDate));
            const end = startOfDay(parseISO(req.endDate));
            return (isAfter(d, start) || isSameDay(d, start)) && (isBefore(d, end) || isSameDay(d, end));
          });
          
          return !isOnLeave;
        });

      return {
        employee: emp,
        missingDates
      };
    }).filter(item => item.missingDates.length > 0);
  }, [logs, employees, today, leaveRequests, holidays]);

  const navigatePeriod = (direction: 'prev' | 'next') => {
    setAnchorDate(prev => {
      const factor = direction === 'prev' ? -1 : 1;
      switch (period) {
        case 'day': return addDays(prev, factor);
        case 'week': return addWeeks(prev, factor);
        case 'month': return addMonths(prev, factor);
        default: return prev;
      }
    });
  };

  const handleExport = () => {
    const filteredEmployees = reportDept === 'All' ? employees : employees.filter(e => e.department === reportDept);
    exportToExcel(logs, filteredEmployees, startDate, endDate, leaveRequests, departments);
  };

  const todayDate = new Date();
  const lastMonthDate = addMonths(todayDate, -1);
  const presetRanges = [
    { label: 'เดือนนี้', start: new Date(todayDate.getFullYear(), todayDate.getMonth(), 1), end: endOfMonth(todayDate) },
    { label: 'เดือนที่แล้ว', start: new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 1), end: endOfMonth(lastMonthDate) },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Header Summary Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl w-full sm:w-fit">
            {(['day', 'week', 'month'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPeriod(p);
                  setAnchorDate(new Date()); 
                }}
                className={`flex-1 py-2 px-6 rounded-xl text-xs font-bold transition-all capitalize whitespace-nowrap ${
                  period === p 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {p === 'day' ? 'รายวัน' : p === 'week' ? 'รายสัปดาห์' : 'รายเดือน'}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-fit justify-center">
             <button 
              onClick={() => navigatePeriod('prev')}
              className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-900 border border-slate-100"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 font-black text-slate-700 text-sm min-w-[180px] text-center shadow-inner">
              {dateLabel}
            </div>
            <button 
              onClick={() => navigatePeriod('next')}
              className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-900 border border-slate-100"
            >
              <ChevronRight size={20} />
            </button>
            <button 
              onClick={() => setAnchorDate(new Date())}
              className="p-2 hover:bg-indigo-50 rounded-full transition-colors text-indigo-400 hover:text-indigo-600 border border-indigo-50"
              title="Reset to today"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>

        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-full border border-slate-100 text-center">
          หน่วยวัด: <span className="text-slate-900 font-black">วันทำงาน (8ชม./วัน)</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'WFH Total (Days)', value: stats.wfh, icon: Home, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: 'Office Total (Days)', value: stats.office, icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: 'Off-Site (Days)', value: stats.offsite, icon: MapPin, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
          { label: 'Leave Approved', value: stats.leaveApproved, icon: Plane, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
          { label: 'Leave Pending', value: stats.leavePending, icon: Timer, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
          { label: 'Missing Logs', value: stats.missing, icon: UserX, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100' },
        ].map((card, i) => (
          <div key={i} className={`bg-white p-5 rounded-2xl border ${card.border} shadow-sm flex flex-col items-center text-center transition-transform hover:scale-[1.02]`}>
            <div className={`p-3 rounded-2xl ${card.bg} ${card.color} mb-3 shadow-inner`}>
              <card.icon size={24} />
            </div>
            <div className="text-3xl font-black text-slate-900">{card.value}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 leading-tight">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Missing Check-ins Section */}
        <div className="lg:col-span-1 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 bg-slate-50/30">
            <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
              <AlertCircle size={18} className="text-rose-500" />
              รายชื่อที่ยังไม่ได้ Check-in
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">สรุปวันทำการที่ยังไม่มีข้อมูลในเดือนนี้</p>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[500px] p-4 space-y-4 custom-scrollbar">
            {missingCheckIns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4">
                  <Clock size={32} />
                </div>
                <h4 className="font-bold text-slate-800">Perfect Record!</h4>
                <p className="text-xs text-slate-500 mt-2">พนักงานทุกคนบันทึกเวลาครบถ้วน</p>
              </div>
            ) : (
              missingCheckIns.map(item => (
                <div 
                  key={item.employee.id} 
                  onClick={() => onViewProfile?.(item.employee)}
                  className="group p-4 rounded-2xl border border-slate-50 bg-white hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <img src={item.employee.avatar} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt="" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-black text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{item.employee.name}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{item.employee.department}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-rose-600 font-black text-xs">{item.missingDates.length}</div>
                      <div className="text-[8px] text-rose-400 font-bold uppercase tracking-tighter">วัน</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5">
                    {item.missingDates.map(dateStr => (
                      <span key={dateStr} className="px-2 py-0.5 rounded-lg bg-white border border-slate-100 text-[9px] font-bold text-slate-500 shadow-xs">
                        {format(new Date(dateStr), 'MMM d')}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Export Report Section */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-emerald-100 text-emerald-600 p-3 rounded-2xl">
              <FileSpreadsheet size={32} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Export Report</h2>
              <p className="text-xs text-slate-500 font-medium">ส่งออกข้อมูลการเข้างานเป็นไฟล์ Excel (.xlsx)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CalendarIcon size={12} /> Start Date
              </label>
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50 font-medium text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CalendarIcon size={12} /> End Date
              </label>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50 font-medium text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {presetRanges.map(range => (
              <button
                key={range.label}
                onClick={() => {
                  setStartDate(format(range.start, 'yyyy-MM-dd'));
                  setEndDate(format(range.end, 'yyyy-MM-dd'));
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors"
              >
                {range.label}
              </button>
            ))}
          </div>

          <div className="space-y-2 mb-8">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Filter size={12} /> Department Filter
            </label>
            <select 
              value={reportDept} 
              onChange={e => setReportDept(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50 font-medium text-sm cursor-pointer"
            >
              <option value="All">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <button
              onClick={handleExport}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-emerald-100 transition-all hover:scale-[1.01] active:scale-[0.99] uppercase tracking-wider text-sm"
            >
              <Download size={20} />
              Download Full Excel Report
            </button>
          </div>

          {/* Detailed Report Explanation Section */}
          <div className="mt-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" />
              รายละเอียดข้อมูลที่จะปรากฏในรายงาน (.xlsx)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5"></div>
                  <div>
                    <div className="text-[11px] font-black text-slate-700">Individual Summary (สรุปรายบุคคล)</div>
                    <div className="text-[10px] text-slate-500 font-medium">รวมชั่วโมงทำงาน และสรุปจำนวนวันลาแยกตามสถานะ (Approved/Pending)</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5"></div>
                  <div>
                    <div className="text-[11px] font-black text-slate-700">Department Summary (สรุปรายแผนก)</div>
                    <div className="text-[10px] text-slate-500 font-medium">สถิติภาพรวมวันทำงานและวันลาเฉลี่ยต่อแผนก</div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5"></div>
                  <div>
                    <div className="text-[11px] font-black text-slate-700">Detailed Attendance (บันทึกการเข้างาน)</div>
                    <div className="text-[10px] text-slate-500 font-medium">รายการลงเวลาดิบรายวันพร้อมสถานที่และหมายเหตุ</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5"></div>
                  <div>
                    <div className="text-[11px] font-black text-slate-700">Leave Detailed Records (บันทึกการลา)</div>
                    <div className="text-[10px] text-slate-500 font-medium">รายละเอียดการลาทุกรายการ: เหตุผล, สถานะ, และช่วงวันที่ลา</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};