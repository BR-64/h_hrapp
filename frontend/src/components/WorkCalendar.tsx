import React, { useState, useMemo, useEffect } from 'react';
import { WorkLog, Employee, LocationType, LeaveRequest, LeaveStatus, LeaveType, LeaveDuration, CompanyHoliday } from '../types';
import { TYPE_COLORS, isWorkingDay as baseIsWorkingDay } from '../constants';
import { ChevronLeft, ChevronRight, Filter, Calendar as CalendarIcon, MapPin, Building2, Home, CheckCircle2, AlertTriangle, Info, Trash2, CalendarRange, X, Clock, ToggleLeft, ToggleRight, Sparkles, PlusCircle, ArrowRight, UserCheck, UserMinus, ChevronDown, ChevronUp, RotateCcw, Plus, Trash, AlertCircle, Star, ClipboardList, MousePointer2, Users, Edit3, UserX, Shield } from 'lucide-react';
import { 
  format, 
  addMonths, 
  endOfMonth, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval,
  addYears,
  isAfter,
  isBefore,
  isValid,
  isWeekend,
  isWithinInterval
} from 'date-fns';

// Fix: Local implementation for missing date-fns parseISO
const parseISO = (dateStr: string) => new Date(dateStr);

const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const subDays = (date: Date, amount: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() - amount);
  return d;
};

const timeToMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// Helper function to get Thai leave text based on requirement:
// Sick Leave -> ลาป่วย, Others -> ลา
const getLeaveDisplayText = (type: LeaveType, status: LeaveStatus): string => {
  return type === LeaveType.SICK ? 'ลาป่วย' : 'ลา';
};

const LEAVE_ICONS: Record<LeaveType, string> = {
  [LeaveType.SICK]: '🤒',
  [LeaveType.ANNUAL]: '🏖️',
  [LeaveType.PERSONAL]: '🏠',
  [LeaveType.COMPENSATION]: '⏳',
  [LeaveType.MATERNITY_1]: '🤰',
  [LeaveType.MATERNITY_2]: '👶',
  [LeaveType.TRAINING]: '📚',
  [LeaveType.STERILIZATION]: '🏥',
  [LeaveType.ORDINATION]: '🙏',
  [LeaveType.UNPAID]: '💸',
  [LeaveType.CHILD_CARE]: '🍼',
};

interface CustomShift {
  id: string;
  startTime: string;
  endTime: string;
  type: LocationType | null;
  note: string;
}

interface WorkCalendarProps {
  logs: WorkLog[];
  employees: Employee[];
  departments: string[];
  holidays: CompanyHoliday[];
  currentUser: Employee;
  leaveRequests?: LeaveRequest[];
  onCheckIn: (
    dateOrDates: string | string[], 
    type: LocationType, 
    note?: string, 
    customTimestamp?: string,
    startTime?: string,
    endTime?: string
  ) => void;
  onRemoveCheckIn: (date: string) => void;
  externalSelectedDate?: Date | null;
  onExternalDateChange?: (date: Date | null) => void;
  onViewProfile?: (user: Employee) => void;
}

const TIME_PRESETS = [
  { id: 'standard', label: 'Standard (AM/PM)' },
  { id: 'custom', label: 'Custom Time', isCustom: true },
];

export const WorkCalendar: React.FC<WorkCalendarProps> = ({ 
  logs, 
  employees, 
  departments,
  holidays,
  currentUser, 
  leaveRequests = [],
  onCheckIn, 
  onRemoveCheckIn,
  externalSelectedDate,
  onExternalDateChange,
  onViewProfile
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterDept, setFilterDept] = useState('All');
  const [filterLoc, setFilterLoc] = useState('All');
  const [selectedDayInfo, setSelectedDayInfo] = useState<{date: Date, logs: WorkLog[], leaves: LeaveRequest[]} | null>(null);
  const [showMissingSection, setShowMissingSection] = useState(true);
  
  const [isEditing, setIsEditing] = useState(false);
  const [specifyTime, setSpecifyTime] = useState(false);
  const [selectedTimePreset, setSelectedTimePreset] = useState<string>('standard');
  const [isPlanningEnabled, setIsPlanningEnabled] = useState(false);
  
  const [standardAMType, setStandardAMType] = useState<LocationType | null>(null);
  const [standardAMNote, setStandardAMNote] = useState('');
  const [standardPMType, setStandardPMType] = useState<LocationType | null>(null);
  const [standardPMNote, setStandardPMNote] = useState('');

  const [customShifts, setCustomShifts] = useState<CustomShift[]>([
    { id: '1', startTime: '09:00', endTime: '13:00', type: null, note: '' }
  ]);

  const [showSuccess, setShowSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isPendingRemoval, setIsPendingRemoval] = useState(false);

  const [useRange, setUseRange] = useState(false);
  const [startDateRange, setStartDateRange] = useState('');
  const [endDateRange, setEndDateRange] = useState('');

  const [teamListFilter, setTeamListFilter] = useState('');

  useEffect(() => {
    if (externalSelectedDate) {
      handleDateClick(externalSelectedDate);
    }
  }, [externalSelectedDate]);

  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = endOfMonth(monthStart);
  const startDate = new Date(new Date(monthStart).setDate(monthStart.getDate() - monthStart.getDay()));
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Always show current user's logs
      if (log.employeeId === currentUser.id) return true;

      const emp = employees.find(e => e.id === log.employeeId);
      const deptMatch = filterDept === 'All' || emp?.department === filterDept;
      const locMatch = filterLoc === 'All' || 
                      (filterLoc === 'Office' && (log.type === LocationType.OFFICE_HANDSE || log.type === LocationType.OFFICE_KRAC)) ||
                      log.type === filterLoc;
      return deptMatch && locMatch;
    });
  }, [logs, currentUser.id, employees, filterDept, filterLoc]);

  const myMissingDates = useMemo(() => {
    const today = startOfDay(new Date());
    const monthBegin = startOfMonth(currentDate);
    const lastCheckDay = subDays(today, 0); 
    
    const workingDaysInRange = eachDayOfInterval({ 
      start: monthBegin, 
      end: isBefore(lastCheckDay, monthBegin) ? monthBegin : lastCheckDay 
    }).filter(d => baseIsWorkingDay(d, holidays) && !isAfter(d, today));

    const myLogs = logs.filter(l => l.employeeId === currentUser.id);
    const logDates = new Set(myLogs.map(l => l.date));
    
    const myLeaves = leaveRequests.filter(req => 
      req.employeeId === currentUser.id && 
      (req.status === LeaveStatus.PENDING || req.status === LeaveStatus.APPROVED)
    );

    return workingDaysInRange
      .map(d => format(d, 'yyyy-MM-dd'))
      .filter(dateStr => {
        // If already logged, not missing
        if (logDates.has(dateStr)) return false;
        
        // If has leave request for this day, not missing
        const d = parseISO(dateStr);
        const isOnLeave = myLeaves.some(req => {
          const start = startOfDay(parseISO(req.startDate));
          const end = startOfDay(parseISO(req.endDate));
          return (isAfter(d, start) || isSameDay(d, start)) && (isBefore(d, end) || isSameDay(d, end));
        });
        
        return !isOnLeave;
      });
  }, [logs, currentUser.id, currentDate, holidays, leaveRequests]);

  const getLogsForDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return filteredLogs.filter(l => l.date === dateStr);
  };

  const getLeavesForDay = (day: Date) => {
    return leaveRequests.filter(req => {
      const start = parseISO(req.startDate);
      const end = parseISO(req.endDate);
      const isDateMatch = isWithinInterval(startOfDay(day), { 
        start: startOfDay(start), 
        end: startOfDay(end) 
      });
      const isStatusMatch = req.status === LeaveStatus.PENDING || req.status === LeaveStatus.APPROVED;
      return isDateMatch && isStatusMatch;
    });
  };

  const handleDateClick = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayLogs = getLogsForDay(day);
    const dayLeaves = getLeavesForDay(day);
    const myLogs = dayLogs.filter(l => l.employeeId === currentUser.id);
    const hasMyLogs = myLogs.length > 0;

    setSelectedDayInfo({ date: day, logs: dayLogs, leaves: dayLeaves });
    
    setIsEditing(!hasMyLogs);
    setSpecifyTime(false);
    setSelectedTimePreset('standard');
    setIsPlanningEnabled(false);
    setTeamListFilter('');
    
    setStandardAMType(null);
    setStandardPMType(null);
    setCustomShifts([{ 
      id: Math.random().toString(), 
      startTime: '09:00', 
      endTime: '13:00', 
      type: null, 
      note: '' 
    }]);

    setStandardAMNote('');
    setStandardPMNote('');
    
    setShowSuccess(false);
    setValidationError(null);
    setIsPendingRemoval(false);
    setUseRange(false);
    setStartDateRange(dateStr);
    setEndDateRange(dateStr);
  };

  const handleCloseModal = () => {
    setSelectedDayInfo(null);
    if (onExternalDateChange) onExternalDateChange(null);
  };

  const handleModalSubmit = async () => {
    if (!selectedDayInfo) return;

    if (isPendingRemoval) {
      onRemoveCheckIn(format(selectedDayInfo.date, 'yyyy-MM-dd'));
      setShowSuccess(true);
      setTimeout(() => { setShowSuccess(false); handleCloseModal(); }, 1500);
      return;
    }

    let datesToSubmit: string[];
    const today = startOfDay(new Date());

    if (useRange) {
      const start = new Date(startDateRange);
      const end = new Date(endDateRange);
      if (!isValid(start) || !isValid(end) || isBefore(end, start)) {
        setValidationError('โปรดตรวจสอบความถูกต้องของช่วงวันที่');
        return;
      }
      datesToSubmit = eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));
    } else {
      datesToSubmit = [format(selectedDayInfo.date, 'yyyy-MM-dd')];
    }

    const hasPastDate = datesToSubmit.some(dateStr => isBefore(startOfDay(new Date(dateStr)), today));

    if (specifyTime) {
      if (selectedTimePreset === 'standard') {
        if (!standardAMType || !standardPMType) {
          setValidationError('โปรดระบุสถานที่ทำงานให้ครบทั้ง Morning และ Afternoon');
          return;
        }
        if (standardAMType === LocationType.OFFSITE && !standardAMNote.trim()) {
          setValidationError('โปรดระบุรายละเอียดสำหรับสถานที่ Off-Site ในช่วงเช้า');
          return;
        }
        if (standardPMType === LocationType.OFFSITE && !standardPMNote.trim()) {
          setValidationError('โปรดระบุรายละเอียดสำหรับสถานที่ Off-Site ในช่วงบ่าย');
          return;
        }
      } else {
        let totalMinutes = 0;
        const sortedShifts = [...customShifts].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

        for (let i = 0; i < sortedShifts.length; i++) {
          const shift = sortedShifts[i];
          const startMin = timeToMinutes(shift.startTime);
          const endMin = timeToMinutes(shift.endTime);

          if (!shift.type) {
            setValidationError('โปรดเลือกสถานที่สำหรับทุกช่วงเวลาที่กำหนด');
            return;
          }
          if (shift.type === LocationType.OFFSITE && !shift.note.trim()) {
            setValidationError(`โปรดระบุรายละเอียดสำหรับ Shift #${i + 1} (Off-Site)`);
            return;
          }
          if (startMin >= endMin) {
            setValidationError(`ช่วงเวลา ${shift.startTime} - ${shift.endTime} ไม่ถูกต้อง`);
            return;
          }
          totalMinutes += (endMin - startMin);
        }

        if (totalMinutes < 480) {
          setValidationError('เวลาทำงานรวมต้องครบอย่างน้อย 8 ชั่วโมง');
          return;
        }
      }
    } else {
      if (!standardAMType) {
        setValidationError('โปรดเลือกสถานที่ทำงาน');
        return;
      }
      if (standardAMType === LocationType.OFFSITE && !standardAMNote.trim()) {
        setValidationError('โปรดระบุรายละเอียด (สถานที่) เมื่อเลือก Off-Site');
        return;
      }
      if (hasPastDate && !standardAMNote.trim()) {
        setValidationError('โปรดระบุเหตุผลสำหรับการ Check-in ย้อนหลัง');
        return;
      }
    }

    if (!specifyTime) {
      onCheckIn(datesToSubmit, standardAMType!, standardAMNote);
    } else {
      if (selectedTimePreset === 'standard') {
        onCheckIn(datesToSubmit, standardAMType!, standardAMNote, undefined, '09:00', '13:00');
        onCheckIn(datesToSubmit, standardPMType!, standardPMNote, undefined, '13:00', '17:00');
      } else {
        customShifts.forEach(shift => {
          onCheckIn(datesToSubmit, shift.type!, shift.note, undefined, shift.startTime, shift.endTime);
        });
      }
    }
    
    setShowSuccess(true);
    setValidationError(null);
    setTimeout(() => { setShowSuccess(false); handleCloseModal(); }, 1500);
  };

  const isPastDate = selectedDayInfo && isBefore(startOfDay(selectedDayInfo.date), startOfDay(new Date()));
  const isFutureDate = selectedDayInfo && isAfter(startOfDay(selectedDayInfo.date), startOfDay(new Date()));
  const isTodaySelected = selectedDayInfo && isSameDay(selectedDayInfo.date, new Date());
  const meLogsForDay = selectedDayInfo ? logs.filter(l => l.employeeId === currentUser.id && l.date === format(selectedDayInfo.date, 'yyyy-MM-dd')) : [];
  const isSelectedDayMe = meLogsForDay.length > 0;

  const getLogActualCheckInTime = (log: WorkLog) => {
    try {
      const logDate = new Date(log.date);
      const today = startOfDay(new Date());
      if (!isAfter(logDate, today)) {
        return format(new Date(log.timestamp), 'HH:mm');
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const getLogTimeDisplay = (log: WorkLog) => {
    const actualTime = getLogActualCheckInTime(log);
    if (log.startTime) {
      return `${log.startTime} - ${log.endTime}${actualTime ? ` (เช็คอินเมื่อ ${actualTime})` : ''}`;
    }
    return actualTime ? `เช็คอินเมื่อ ${actualTime}` : 'เต็มวัน';
  };

  const renderLocationButtons = (currentType: LocationType | null, onSelect: (type: LocationType) => void, isProminent: boolean = false) => {
    const isOfficeActive = currentType === LocationType.OFFICE_HANDSE || currentType === LocationType.OFFICE_KRAC;
    
    return (
      <div className="space-y-4">
        <div className={`grid grid-cols-3 gap-2 md:gap-3 mb-3 md:mb-4`}>
          <button 
            type="button"
            onClick={() => onSelect(LocationType.WFH)} 
            className={`rounded-xl md:rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 md:gap-2
              ${isProminent ? 'p-4 md:p-6' : 'p-2 md:p-3'}
              ${currentType === LocationType.WFH 
                ? `${TYPE_COLORS[LocationType.WFH].bg} ${TYPE_COLORS[LocationType.WFH].border} ${TYPE_COLORS[LocationType.WFH].text} shadow-md scale-105` 
                : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-white hover:border-slate-200'
              }`}
          >
            <div className={`p-1.5 md:p-2 rounded-lg md:rounded-xl ${currentType === LocationType.WFH ? TYPE_COLORS[LocationType.WFH].solid + ' text-white' : 'bg-white text-slate-300'}`}>
              <Home size={isProminent ? 24 : 18} />
            </div>
            <span className={`font-black uppercase tracking-tight ${isProminent ? 'text-[11px] md:text-xs' : 'text-[9px] md:text-[10px]'}`}>WFH</span>
          </button>

          <button 
            type="button"
            onClick={() => {
              if (!isOfficeActive) {
                // Default to branch matching base location
                const isKracBase = currentUser.baseLocation?.includes('KRAC');
                onSelect(isKracBase ? LocationType.OFFICE_KRAC : LocationType.OFFICE_HANDSE);
              } else {
                onSelect(currentType!);
              }
            }}
            className={`rounded-xl md:rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 md:gap-2
              ${isProminent ? 'p-4 md:p-6' : 'p-2 md:p-3'}
              ${isOfficeActive 
                ? `bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md scale-105` 
                : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-white hover:border-slate-200'
              }`}
          >
            <div className={`p-1.5 md:p-2 rounded-lg md:rounded-xl ${isOfficeActive ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300'}`}>
              <Building2 size={isProminent ? 24 : 18} />
            </div>
            <span className={`font-black uppercase tracking-tight ${isProminent ? 'text-[11px] md:text-xs' : 'text-[9px] md:text-[10px]'}`}>Office</span>
          </button>

          <button 
            type="button"
            onClick={() => onSelect(LocationType.OFFSITE)} 
            className={`rounded-xl md:rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 md:gap-2
              ${isProminent ? 'p-4 md:p-6' : 'p-2 md:p-3'}
              ${currentType === LocationType.OFFSITE 
                ? `${TYPE_COLORS[LocationType.OFFSITE].bg} ${TYPE_COLORS[LocationType.OFFSITE].border} ${TYPE_COLORS[LocationType.OFFSITE].text} shadow-md scale-105` 
                : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-white hover:border-slate-200'
              }`}
          >
            <div className={`p-1.5 md:p-2 rounded-lg md:rounded-xl ${currentType === LocationType.OFFSITE ? TYPE_COLORS[LocationType.OFFSITE].solid + ' text-white' : 'bg-white text-slate-300'}`}>
              <MapPin size={isProminent ? 24 : 18} />
            </div>
            <span className={`font-black uppercase tracking-tight ${isProminent ? 'text-[11px] md:text-xs' : 'text-[9px] md:text-[10px]'}`}>Off-Site</span>
          </button>
        </div>

        {isOfficeActive && (
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 animate-in slide-in-from-top-2 duration-300">
            <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 text-center">
              Please Select Office Branch (กรุณาเลือกสาขา)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onSelect(LocationType.OFFICE_HANDSE)}
                className={`py-3 rounded-lg font-black text-[10px] uppercase transition-all border-2 flex items-center justify-center gap-2 ${
                  currentType === LocationType.OFFICE_HANDSE
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                    : 'bg-white border-emerald-100 text-emerald-600 hover:bg-emerald-100'
                }`}
              >
                {currentType === LocationType.OFFICE_HANDSE && <CheckCircle2 size={14} />}
                HAND SE
              </button>
              <button
                type="button"
                onClick={() => onSelect(LocationType.OFFICE_KRAC)}
                className={`py-3 rounded-lg font-black text-[10px] uppercase transition-all border-2 flex items-center justify-center gap-2 ${
                  currentType === LocationType.OFFICE_KRAC
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                    : 'bg-white border-emerald-100 text-emerald-600 hover:bg-emerald-100'
                }`}
              >
                {currentType === LocationType.OFFICE_KRAC && <CheckCircle2 size={14} />}
                KRAC
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const filteredTeamLogs = useMemo(() => {
    if (!selectedDayInfo || !teamListFilter) return []; 
    if (teamListFilter === 'All') return selectedDayInfo.logs;
    if (teamListFilter === 'Leave' || teamListFilter === 'Missing') return [];
    if (teamListFilter === 'Office') return selectedDayInfo.logs.filter(log => log.type === LocationType.OFFICE_HANDSE || log.type === LocationType.OFFICE_KRAC);
    return selectedDayInfo.logs.filter(log => log.type === teamListFilter);
  }, [selectedDayInfo, teamListFilter]);

  const filteredTeamLeaves = useMemo(() => {
    if (!selectedDayInfo || !teamListFilter) return []; 
    if (teamListFilter === 'All' || teamListFilter === 'Leave') return selectedDayInfo.leaves;
    return [];
  }, [selectedDayInfo, teamListFilter]);

  const missingTeamMembers = useMemo(() => {
    if (!selectedDayInfo || !teamListFilter) return []; 
    if (teamListFilter !== 'All' && teamListFilter !== 'Missing') return [];
    if (!baseIsWorkingDay(selectedDayInfo.date, holidays)) return [];
    const checkedInIds = new Set(selectedDayInfo.logs.map(l => l.employeeId));
    const onLeaveIds = new Set(selectedDayInfo.leaves.map(l => l.employeeId));
    return employees.filter(emp => !checkedInIds.has(emp.id) && !onLeaveIds.has(emp.id));
  }, [selectedDayInfo, teamListFilter, employees, holidays]);

  return (
    <div className="space-y-6">
      {/* Missing Notifications */}
      {myMissingDates.length > 0 && (
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <button onClick={() => setShowMissingSection(!showMissingSection)} className="w-full flex items-center justify-between p-4 bg-red-50/50 hover:bg-red-50 transition-colors text-left">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-500 flex-shrink-0 flex items-center justify-center text-white shadow-sm ring-4 ring-red-50"><AlertTriangle size={18} /></div>
              <div className="min-w-0">
                <h3 className="font-bold text-red-900 text-sm truncate">แจ้งเตือน: ยังไม่ได้ Check-in</h3>
                <p className="text-[10px] text-red-600 font-medium truncate">คุณมีรายการที่ยังไม่ได้บันทึก ({myMissingDates.length} วัน)</p>
              </div>
            </div>
            {showMissingSection ? <ChevronUp className="text-red-400 flex-shrink-0" size={20} /> : <ChevronDown className="text-red-400 flex-shrink-0" size={20} />}
          </button>
          {showMissingSection && (
            <div className="p-4 bg-red-50/20 animate-in slide-in-from-top-2 duration-300">
              <div className="flex flex-wrap gap-2">
                {myMissingDates.map(dateStr => (
                  <button 
                    key={dateStr} 
                    onClick={() => handleDateClick(new Date(dateStr))} 
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-red-100 text-[10px] font-bold text-red-600 hover:border-red-300 hover:bg-red-50 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                  >
                    <CalendarIcon size={14} />
                    {format(new Date(dateStr), 'EEEE, d MMM')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center bg-slate-100 rounded-lg p-1 w-full lg:w-auto overflow-hidden">
          <button onClick={() => setCurrentDate(addYears(currentDate, -1))} className="p-2 hover:bg-white rounded-md transition-colors text-slate-400 hover:text-slate-900"><ChevronLeft size={16} /><ChevronLeft size={16} className="-ml-2 inline" /></button>
          <button onClick={() => setCurrentDate(addMonths(currentDate, -1))} className="p-2 hover:bg-white rounded-md transition-colors text-slate-400 hover:text-slate-900"><ChevronLeft size={16} /></button>
          <div className="flex-1 px-2 font-bold text-slate-800 text-center text-sm min-w-[120px]">{format(currentDate, 'MMMM yyyy')}</div>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white rounded-md transition-colors text-slate-400 hover:text-slate-900"><ChevronRight size={16} /></button>
          <button onClick={() => setCurrentDate(addYears(currentDate, 1))} className="p-2 hover:bg-white rounded-md transition-colors text-slate-400 hover:text-slate-900"><ChevronRight size={16} className="inline" /><ChevronRight size={16} className="-ml-2 inline" /></button>
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="flex-1 lg:flex-initial bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none font-medium text-slate-600 cursor-pointer text-[11px] lg:text-sm">
            <option value="All">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterLoc} onChange={(e) => setFilterLoc(e.target.value)} className="flex-1 lg:flex-initial bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none font-medium text-slate-600 cursor-pointer text-[11px] lg:text-sm">
            <option value="All">All Locations</option>
            <option value="Office">Office (All)</option>
            {Object.values(LocationType).filter(v => v !== LocationType.OFFICE_HANDSE && v !== LocationType.OFFICE_KRAC).map(v => <option key={v} value={v}>{v}</option>)}
            <option value={LocationType.OFFICE_HANDSE}>Office (HAND SE)</option>
            <option value={LocationType.OFFICE_KRAC}>Office (KRAC)</option>
          </select>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto scrollbar-hide">
        <div className="min-w-[700px] lg:min-w-full">
          <div className="calendar-grid bg-slate-50 border-b border-slate-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
              <div key={d} className={`py-3 text-center text-[10px] font-black uppercase tracking-widest ${i === 0 || i === 6 ? 'text-red-700' : 'text-slate-400'}`}>
                <span className="hidden sm:inline">{d}</span>
                <span className="sm:hidden">{d[0]}</span>
              </div>
            ))}
          </div>
          <div className="calendar-grid">
            {days.map((day, i) => {
              const dayLogs = getLogsForDay(day);
              const dayLeaves = getLeavesForDay(day);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isWeekendDay = isWeekend(day);
              const dayStr = format(day, 'yyyy-MM-dd');
              const holiday = holidays.find(h => h.date === dayStr);
              const isWorkDay = baseIsWorkingDay(day, holidays);
              
              return (
                <div 
                  key={i} 
                  onClick={() => handleDateClick(day)} 
                  className={`min-h-[85px] lg:min-h-[140px] p-1 lg:p-2 border-r border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group flex flex-col 
                    ${!isCurrentMonth ? 'opacity-30' : ''} 
                    ${isWeekendDay ? 'bg-red-500/10' : (!isWorkDay ? 'bg-slate-50/30' : '')}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className={`text-[10px] lg:text-sm font-black flex items-center justify-center w-5 h-5 lg:w-7 lg:h-7 rounded-full 
                      ${isToday ? 'bg-slate-900 text-white shadow-md' : (isWeekendDay && isCurrentMonth ? 'text-red-700' : 'text-slate-600')}`}>
                      {format(day, 'd')}
                    </div>
                    {holiday && isCurrentMonth && (
                      <div className="text-[7px] lg:text-[8px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-lg border border-rose-100 truncate shadow-sm animate-in zoom-in-95" title={holiday.name}>
                        🇹🇭 {holiday.name}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    {dayLogs.slice(0, 3).map(log => {
                      const emp = employees.find(e => e.id === log.employeeId);
                      const displayType = log.type === LocationType.OFFICE_HANDSE ? 'HAND SE' : log.type === LocationType.OFFICE_KRAC ? 'KRAC' : log.type;
                      const timeInfo = log.startTime && log.endTime ? `[${log.startTime}-${log.endTime}] ` : '';
                      return (
                        <div key={log.id} className={`text-[7px] lg:text-[8px] px-1 py-0.5 rounded truncate font-black ${TYPE_COLORS[log.type].bg} ${TYPE_COLORS[log.type].text}`}>
                          {emp?.nickname || emp?.name}: {timeInfo}{displayType}
                        </div>
                      );
                    })}
                    {dayLeaves.map(leave => {
                      const emp = employees.find(e => e.id === leave.employeeId);
                      const isPending = leave.status === LeaveStatus.PENDING;
                      const thaiType = getLeaveDisplayText(leave.type, leave.status);
                      const emoji = LEAVE_ICONS[leave.type] || '📅';
                      
                      return (
                        <div key={leave.id} className={`text-[7px] lg:text-[8px] px-1 py-0.5 rounded truncate font-black flex items-center gap-1 border
                          ${isPending ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>
                          <span>{emoji}</span> {emp?.nickname || emp?.name}: {thaiType}
                        </div>
                      )
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Section */}
      {selectedDayInfo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className={`p-6 lg:p-8 border-b border-slate-100 flex justify-between items-start flex-shrink-0 ${isTodaySelected ? 'bg-emerald-50/30' : isFutureDate ? 'bg-indigo-50/30' : 'bg-white'}`}>
              <div className="min-w-0">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{format(selectedDayInfo.date, 'EEEE')}</span>
                <h3 className="font-black text-slate-900 text-xl lg:text-2xl truncate">
                   {format(selectedDayInfo.date, 'MMMM d, yyyy')}
                </h3>
                {(() => {
                  const dayHoliday = holidays.find(h => h.date === format(selectedDayInfo.date, 'yyyy-MM-dd'));
                  if (!dayHoliday) return null;
                  return (
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-black uppercase rounded-lg border border-rose-100 shadow-sm">
                      <Star size={10} className="fill-rose-500" /> {dayHoliday.id.startsWith('hol-') ? 'วันหยุดที่บริษัทกำหนดเพิ่มเติม' : 'Thai Public Holiday'}: {dayHoliday.name}
                    </div>
                  );
                })()}
              </div>
              <button onClick={handleCloseModal} className="w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-all flex-shrink-0">✕</button>
            </div>
            
            <div className="p-6 lg:p-8 overflow-y-auto flex-1 space-y-6 lg:space-y-8 custom-scrollbar">
              {isPendingRemoval ? (
                <div className="space-y-8 py-4 animate-in zoom-in-95 duration-200 text-center">
                  <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto shadow-inner ring-8 ring-rose-50/50">
                    <Trash2 size={40} className="animate-bounce" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-2xl font-black text-slate-900 tracking-tight">ยืนยันการลบข้อมูล?</h4>
                    <p className="text-slate-500 font-medium">คุณต้องการลบการ Check-in ของวันที่ <br/><span className="text-slate-900 font-black">{format(selectedDayInfo.date, 'd MMMM yyyy')}</span> ใช่หรือไม่?</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setIsPendingRemoval(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all active:scale-95">ยกเลิก</button>
                    <button onClick={handleModalSubmit} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black text-sm hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all active:scale-95">ยืนยันลบข้อมูล</button>
                  </div>
                </div>
              ) : !isEditing && isSelectedDayMe ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 flex flex-col items-center text-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">สถานะการทำงานของคุณ</span>
                    {meLogsForDay.map(log => {
                      const displayType = log.type === LocationType.OFFICE_HANDSE ? 'HAND SE' : log.type === LocationType.OFFICE_KRAC ? 'KRAC' : log.type;
                      return (
                        <div key={log.id} className="flex flex-col items-center mb-6 last:mb-0">
                          <div className={`w-16 h-16 lg:w-20 lg:h-20 rounded-3xl flex items-center justify-center text-white shadow-lg mb-4 ${TYPE_COLORS[log.type].solid}`}>
                             {log.type === LocationType.WFH ? <Home size={32} /> : (log.type === LocationType.OFFSITE ? <MapPin size={32} /> : <Building2 size={32} />)}
                          </div>
                          <h4 className={`text-xl lg:text-2xl font-black ${TYPE_COLORS[log.type].text}`}>{displayType}</h4>
                          <p className="text-[11px] lg:text-xs font-black text-slate-900 flex items-center justify-center gap-1.5 mt-1">
                            <Clock size={12} className="text-slate-400" /> {getLogTimeDisplay(log)}
                          </p>
                        </div>
                      );
                    })}
                    <div className="mt-8 flex gap-3 w-full">
                      <button onClick={() => setIsEditing(true)} className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] lg:text-sm active:scale-95 transition-transform"><Edit3 size={16} /> แก้ไขข้อมูล</button>
                      <button onClick={() => setIsPendingRemoval(true)} className="p-4 bg-rose-50 text-rose-500 border border-rose-100 rounded-2xl hover:bg-rose-100 transition-all"><Trash2 size={20} /></button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {isFutureDate && (
                    <div className={`flex items-center justify-between p-4 lg:p-6 border-2 rounded-2xl lg:rounded-3xl shadow-sm transition-colors ${isPlanningEnabled ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center ${isPlanningEnabled ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>
                           <ClipboardList size={20} />
                        </div>
                        <div className="flex flex-col">
                           <span className={`text-sm lg:text-base font-black ${isPlanningEnabled ? 'text-indigo-900' : 'text-slate-700'}`}>วางแผนล่วงหน้า</span>
                           <span className="text-[9px] text-slate-400 font-bold uppercase">เลือกสถานที่ทำงานล่วงหน้า</span>
                        </div>
                      </div>
                      <button onClick={() => setIsPlanningEnabled(!isPlanningEnabled)}>
                        {isPlanningEnabled ? <ToggleRight size={32} className="text-indigo-600" /> : <ToggleLeft size={32} className="text-slate-300" />}
                      </button>
                    </div>
                  )}

                  {(!isFutureDate || isPlanningEnabled) && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                      <div className="flex gap-2">
                        {isFutureDate && (
                          <button onClick={() => setUseRange(!useRange)} className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all flex items-center justify-center gap-2 ${useRange ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                            <CalendarRange size={14} /> ช่วงวันที่
                          </button>
                        )}
                        <button onClick={() => setSpecifyTime(!specifyTime)} className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all flex items-center justify-center gap-2 ${specifyTime ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
                          <Clock size={14} /> แบ่งกะเวลา
                        </button>
                      </div>

                      {useRange && isFutureDate && (
                        <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 p-1">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">วันเริ่ม</label>
                            <input type="date" value={startDateRange} onChange={e => setStartDateRange(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100"/>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">วันสิ้นสุด</label>
                            <input type="date" value={endDateRange} min={startDateRange} onChange={e => setEndDateRange(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100"/>
                          </div>
                        </div>
                      )}

                      <div className="space-y-5">
                        {!specifyTime ? (
                          <div className="p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border-2 border-slate-100 bg-white">
                             <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">เลือกสถานที่</h5>
                             {renderLocationButtons(standardAMType, (type) => setStandardAMType(type), isTodaySelected)}
                             <textarea 
                               value={standardAMNote} 
                               onChange={e => setStandardAMNote(e.target.value)} 
                               placeholder={standardAMType === LocationType.OFFSITE ? "ระบุรายละเอียด/สถานที่นัดหมาย... *" : (isPastDate ? "ระบุเหตุผลบันทึกย้อนหลัง... *" : "หมายเหตุ (ถ้ามี)...")}
                               className={`w-full text-xs p-4 rounded-xl border transition-all min-h-[80px] focus:outline-none bg-slate-50 border-slate-100 focus:bg-white focus:border-indigo-200 ${standardAMType === LocationType.OFFSITE && !standardAMNote.trim() ? 'ring-2 ring-rose-200 border-rose-300' : ''}`}
                             />
                          </div>
                        ) : selectedTimePreset === 'standard' ? (
                          <div className="space-y-4 animate-in slide-in-from-top-4">
                            <div className="p-4 lg:p-5 rounded-[1.5rem] lg:rounded-[2rem] border-2 border-amber-100 bg-amber-50/5">
                              <h5 className="text-[9px] font-black text-amber-600 uppercase mb-3">ช่วงเช้า (09:00 - 13:00)</h5>
                              {renderLocationButtons(standardAMType, (type) => setStandardAMType(type))}
                              <textarea value={standardAMNote} onChange={e => setStandardAMNote(e.target.value)} placeholder={standardAMType === LocationType.OFFSITE ? "หมายเหตุเช้า (Off-Site)... *" : "หมายเหตุเช้า..."} className={`w-full text-xs p-3 rounded-xl border border-slate-100 bg-white focus:outline-none focus:border-amber-200 ${standardAMType === LocationType.OFFSITE && !standardAMNote.trim() ? 'ring-2 ring-rose-200 border-rose-300' : ''}`} />
                            </div>
                            <div className="p-4 lg:p-5 rounded-[1.5rem] lg:rounded-[2rem] border-2 border-indigo-100 bg-indigo-50/5">
                              <h5 className="text-[9px] font-black text-indigo-600 uppercase mb-3">ช่วงบ่าย (13:00 - 17:00)</h5>
                              {renderLocationButtons(standardPMType, (type) => setStandardPMType(type))}
                              <textarea value={standardPMNote} onChange={e => setStandardPMNote(e.target.value)} placeholder={standardPMType === LocationType.OFFSITE ? "หมายเหตุบ่าย (Off-Site)... *" : "หมายเหตุบ่าย..."} className={`w-full text-xs p-3 rounded-xl border border-slate-100 bg-white focus:outline-none focus:border-indigo-200 ${standardPMType === LocationType.OFFSITE && !standardPMNote.trim() ? 'ring-2 ring-rose-200 border-rose-300' : ''}`} />
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {validationError && <p className="text-[10px] md:text-xs font-bold text-rose-500 bg-rose-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-rose-100 flex items-center gap-2 animate-in shake"><AlertCircle size={14} /> {validationError}</p>}
              
                      <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        {isSelectedDayMe && <button onClick={() => setIsEditing(false)} className="px-6 py-4 bg-slate-100 text-slate-600 rounded-xl lg:rounded-2xl font-black text-xs lg:text-sm hover:bg-slate-200 flex items-center justify-center gap-2"><RotateCcw size={16} /> ยกเลิก</button>}
                        <button onClick={handleModalSubmit} className="flex-1 py-4 rounded-xl lg:rounded-2xl font-black text-xs lg:text-sm shadow-xl active:scale-95 transition-all bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200">{isFutureDate ? 'บันทึกแผนงานล่วงหน้า' : (isSelectedDayMe ? 'ยืนยันการแก้ไข' : 'บันทึกข้อมูล')}</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TEAM STATUS SECTION */}
              <div className="pt-8 border-t border-slate-100 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                       <Users size={20} />
                    </div>
                    <div>
                       <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Team Activity</h4>
                       <p className="text-[9px] text-slate-400 font-bold uppercase">พนักงานทุกคนรวมถึง Admin</p>
                    </div>
                  </div>
                  
                  <div className="relative group min-w-[180px]">
                    <select 
                      value={teamListFilter} 
                      onChange={e => setTeamListFilter(e.target.value)} 
                      className="w-full pl-3 pr-8 py-2.5 bg-white border-2 border-indigo-100 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-100 appearance-none cursor-pointer hover:border-indigo-300 transition-colors"
                    >
                      <option value="">- เลือกเพื่อดูสถานะ -</option>
                      <option value="All">All Status (ดูทั้งหมด)</option>
                      <option value={LocationType.WFH}>WFH</option>
                      <option value="Office">Office</option>
                      <option value={LocationType.OFFSITE}>Off-Site</option>
                      <option value="Leave">On Leave (ลา)</option>
                      <option value="Missing">No Data (ยังไม่ลงเวลา)</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-3">
                   {teamListFilter === '' ? (
                     <div className="py-10 text-center bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
                        <MousePointer2 size={24} className="text-slate-300 mx-auto mb-2 opacity-50" />
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">กรุณาเลือกหมวดหมู่ที่ Dropdown ด้านบน</p>
                     </div>
                   ) : (
                     <>
                        {/* Render Team Logs */}
                        {(teamListFilter === 'All' || teamListFilter === LocationType.WFH || teamListFilter === 'Office' || teamListFilter === LocationType.OFFSITE) && 
                          filteredTeamLogs.map(log => {
                          const emp = employees.find(e => e.id === log.employeeId);
                          const displayType = log.type === LocationType.OFFICE_HANDSE ? 'HAND SE' : log.type === LocationType.OFFICE_KRAC ? 'KRAC' : log.type;
                          const timePrefix = log.startTime && log.endTime ? `[${log.startTime}-${log.endTime}] ` : '';
                          return (
                            <div 
                              key={log.id} 
                              onClick={() => emp && onViewProfile?.(emp)}
                              className="flex items-center gap-4 p-3 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-indigo-100 transition-all cursor-pointer"
                            >
                              <img src={emp?.avatar} className={`w-10 h-10 rounded-xl border border-white shadow-sm ${emp?.id === currentUser.id ? 'ring-2 ring-indigo-400' : ''}`} alt="" />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-black text-slate-800 truncate flex items-center gap-1.5">
                                  {emp?.nickname || emp?.name}
                                  {emp?.role === 'Admin' && <Shield size={10} className="text-rose-500 fill-rose-500" />}
                                  {emp?.id === currentUser.id && <span className="text-[7px] bg-slate-900 text-white px-1.5 py-0.5 rounded-md uppercase font-black">You</span>}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{emp?.department}</div>
                                  {emp?.role !== 'Employee' && (
                                    <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${emp?.role === 'Admin' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                      {emp?.role}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${TYPE_COLORS[log.type].bg} ${TYPE_COLORS[log.type].text} border ${TYPE_COLORS[log.type].border}`}>
                                  {timePrefix}{displayType}
                                </span>
                                {log.note && <span className="text-[8px] text-slate-400 font-medium truncate max-w-[100px]" title={log.note}>{log.note}</span>}
                              </div>
                            </div>
                          );
                        })}

                        {/* Render Leaves */}
                        {(teamListFilter === 'All' || teamListFilter === 'Leave') && 
                          filteredTeamLeaves.map(req => {
                          const emp = employees.find(e => e.id === req.employeeId);
                          const isPending = req.status === LeaveStatus.PENDING;
                          const leaveText = getLeaveDisplayText(req.type, req.status);
                          const emoji = LEAVE_ICONS[req.type] || '📅';
                          
                          return (
                            <div 
                              key={req.id} 
                              onClick={() => emp && onViewProfile?.(emp)}
                              className={`flex items-center gap-4 p-3 rounded-2xl border cursor-pointer transition-all hover:border-indigo-200 ${isPending ? 'bg-yellow-50/30 border-yellow-100/50' : 'bg-rose-50/30 border-rose-100/50'}`}
                            >
                              <img src={emp?.avatar} className="w-10 h-10 rounded-xl border border-white shadow-sm grayscale" alt="" />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-black text-slate-800 truncate flex items-center gap-1.5">
                                  {emp?.nickname || emp?.name}
                                  {emp?.role === 'Admin' && <Shield size={10} className="text-rose-500 fill-rose-500" />}
                                  {emp?.id === currentUser.id && <span className="text-[7px] bg-slate-900 text-white px-1.5 py-0.5 rounded-md uppercase font-black">You</span>}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{emp?.department}</div>
                                  {emp?.role !== 'Employee' && (
                                    <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${emp?.role === 'Admin' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-500'}`}>
                                      {emp?.role}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border ${isPending ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>
                                  {emoji} {leaveText}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {/* Render Missing */}
                        {(teamListFilter === 'All' || teamListFilter === 'Missing') && 
                          missingTeamMembers.map(emp => (
                          <div 
                            key={emp.id} 
                            onClick={() => onViewProfile?.(emp)}
                            className="flex items-center gap-4 p-3 bg-white border border-dashed border-slate-200 rounded-2xl opacity-60 cursor-pointer hover:opacity-100 transition-all"
                          >
                              <div className={`w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 ${emp.id === currentUser.id ? 'ring-2 ring-slate-300' : ''}`}>
                                <UserX size={16} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-slate-500 truncate flex items-center gap-1.5">
                                  {emp.nickname || emp.name}
                                  {emp.role === 'Admin' && <Shield size={10} className="text-rose-400" />}
                                  {emp.id === currentUser.id && <span className="text-[7px] bg-slate-300 text-white px-1.5 py-0.5 rounded-md uppercase font-black">You</span>}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <div className="text-[9px] font-medium text-slate-300 uppercase tracking-tighter">{emp.department}</div>
                                  {emp.role !== 'Employee' && (
                                    <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase bg-slate-50 text-slate-300">
                                      {emp.role}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-[8px] font-black text-slate-300 uppercase">No Data</span>
                          </div>
                        ))}

                        {/* Category Empty Result */}
                        {filteredTeamLogs.length === 0 && filteredTeamLeaves.length === 0 && missingTeamMembers.length === 0 && (
                          <div className="py-12 text-center">
                              <MousePointer2 size={32} className="text-slate-200 mx-auto mb-3" />
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">ไม่มีพนักงานในหมวดหมู่นี้</p>
                          </div>
                        )}
                     </>
                   )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};