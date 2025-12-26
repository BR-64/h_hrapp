import * as XLSX from 'xlsx';
import { WorkLog, Employee, LocationType, LeaveRequest, LeaveStatus, LeaveType, LeaveDuration } from './types';
import { isWorkingDay } from './constants';
import { eachDayOfInterval, isWithinInterval } from 'date-fns';

const parseISO = (dateStr: string) => new Date(dateStr);
const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const calculateHours = (start?: string, end?: string): number => {
  if (!start || !end) return 8; 
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  const startMinutes = sH * 60 + sM;
  const endMinutes = eH * 60 + eM;
  const diffMinutes = endMinutes - startMinutes;
  return Math.max(0, diffMinutes / 60);
};

const calculateLeaveDaysInPeriod = (req: LeaveRequest, reportStart: string, reportEnd: string): number => {
  // Logic: Only calculate for Approved or Pending status
  if (req.status !== LeaveStatus.APPROVED && req.status !== LeaveStatus.PENDING) return 0;
  
  const rStart = startOfDay(parseISO(reportStart));
  const rEnd = startOfDay(parseISO(reportEnd));
  const lStart = startOfDay(parseISO(req.startDate));
  const lEnd = startOfDay(parseISO(req.endDate));
  const intersectStart = lStart > rStart ? lStart : rStart;
  const intersectEnd = lEnd < rEnd ? lEnd : rEnd;
  
  if (intersectStart > intersectEnd) return 0;
  
  const days = eachDayOfInterval({ start: intersectStart, end: intersectEnd })
    .filter(d => isWorkingDay(d));
    
  if (req.duration !== LeaveDuration.FULL_DAY && days.length === 1) return 0.5;
  return days.length;
};

export const exportToExcel = (logs: WorkLog[], employees: Employee[], startDate: string, endDate: string, leaveRequests: LeaveRequest[] = [], departments: string[] = []) => {
  const filteredLogs = logs.filter(l => l.date >= startDate && l.date <= endDate);
  
  const individualData = employees.map(emp => {
    const empLogs = filteredLogs.filter(l => l.employeeId === emp.id);
    const empLeaves = leaveRequests.filter(r => r.employeeId === emp.id);
    
    const workStats = empLogs.reduce((acc, log) => {
      const hours = calculateHours(log.startTime, log.endTime);
      acc[log.type].hours += hours;
      acc[log.type].count += (hours >= 8 ? 1 : hours / 8);
      acc.totalHours += hours;
      return acc;
    }, {
      [LocationType.WFH]: { hours: 0, count: 0 },
      [LocationType.OFFICE_HANDSE]: { hours: 0, count: 0 },
      [LocationType.OFFICE_KRAC]: { hours: 0, count: 0 },
      [LocationType.OFFSITE]: { hours: 0, count: 0 },
      totalHours: 0
    } as any);

    // Calculate Approved vs Pending days separately
    const approvedLeaves = empLeaves.filter(r => r.status === LeaveStatus.APPROVED);
    const pendingLeaves = empLeaves.filter(r => r.status === LeaveStatus.PENDING);

    const approvedSick = approvedLeaves.filter(r => r.type === LeaveType.SICK).reduce((sum, r) => sum + calculateLeaveDaysInPeriod(r, startDate, endDate), 0);
    const approvedAnnual = approvedLeaves.filter(r => r.type === LeaveType.ANNUAL).reduce((sum, r) => sum + calculateLeaveDaysInPeriod(r, startDate, endDate), 0);
    const approvedOther = approvedLeaves.filter(r => r.type !== LeaveType.SICK && r.type !== LeaveType.ANNUAL).reduce((sum, r) => sum + calculateLeaveDaysInPeriod(r, startDate, endDate), 0);
    
    const totalPending = pendingLeaves.reduce((sum, r) => sum + calculateLeaveDaysInPeriod(r, startDate, endDate), 0);
    const totalApproved = approvedSick + approvedAnnual + approvedOther;

    return {
      'Employee Name': emp.name,
      'Position': emp.position,
      'Department': emp.department,
      'WFH (Hours)': workStats[LocationType.WFH].hours.toFixed(1),
      'Office - HAND SE (Hours)': workStats[LocationType.OFFICE_HANDSE].hours.toFixed(1),
      'Office - KRAC (Hours)': workStats[LocationType.OFFICE_KRAC].hours.toFixed(1),
      'Off-Site (Hours)': workStats[LocationType.OFFSITE].hours.toFixed(1),
      'Total Work Hours': workStats.totalHours.toFixed(1),
      'Equivalent Work Days': (workStats.totalHours / 8).toFixed(2),
      'Sick Leave (Approved)': approvedSick,
      'Annual Leave (Approved)': approvedAnnual,
      'Other Leave (Approved)': approvedOther,
      'TOTAL APPROVED LEAVE': totalApproved,
      'TOTAL PENDING LEAVE': totalPending,
      'Total Absence Days': totalApproved + totalPending
    };
  });

  const departmentData = departments.map(dept => {
    const deptEmployees = employees.filter(e => e.department === dept);
    const deptLogs = filteredLogs.filter(l => deptEmployees.some(e => e.id === l.employeeId));
    const deptEmpIds = new Set(deptEmployees.map(e => e.id));
    const deptLeaves = leaveRequests.filter(r => deptEmpIds.has(r.employeeId));
    const totalHours = deptLogs.reduce((sum, log) => sum + calculateHours(log.startTime, log.endTime), 0);
    const leaveDays = deptLeaves.reduce((sum, r) => sum + calculateLeaveDaysInPeriod(r, startDate, endDate), 0);
    return {
      'Department': dept,
      'Total Employees': deptEmployees.length,
      'Total Work Hours': totalHours.toFixed(1),
      'Equivalent Work Days': (totalHours / 8).toFixed(1),
      'Total Leave Days (Appr+Pend)': leaveDays.toFixed(1),
      'Avg Work Hours per Employee': deptEmployees.length > 0 ? (totalHours / deptEmployees.length).toFixed(1) : '0'
    };
  });

  const detailedLogs = filteredLogs.map(l => {
    const emp = employees.find(e => e.id === l.employeeId);
    const hours = calculateHours(l.startTime, l.endTime);
    return {
      'Date': l.date,
      'Employee': emp?.name || 'Unknown',
      'Position': emp?.position || 'N/A',
      'Department': emp?.department || 'N/A',
      'Location': l.type,
      'Hours': hours.toFixed(1),
      'Time Range': l.startTime ? `${l.startTime} - ${l.endTime}` : 'Full Day (8h)',
      'Note': l.note || '-',
      'Recorded At': new Date(l.timestamp).toLocaleString('th-TH')
    };
  }).sort((a, b) => b.Date.localeCompare(a.Date));

  const leaveDetailedRecords = leaveRequests.filter(r => (r.startDate <= endDate && r.endDate >= startDate)).map(r => {
    const emp = employees.find(e => e.id === r.employeeId);
    return {
      'Employee': emp?.name || 'Unknown',
      'Position': emp?.position || 'N/A',
      'Leave Type': r.type,
      'Full Period': `${r.startDate} to ${r.endDate}`,
      'Days in this Report': calculateLeaveDaysInPeriod(r, startDate, endDate),
      'Status': r.status,
      'Reason': r.reason
    };
  }).sort((a, b) => a.Employee.localeCompare(b.Employee));

  const wb = XLSX.utils.book_new();
  const wsIndividual = XLSX.utils.json_to_sheet(individualData);
  const wsDepartment = XLSX.utils.json_to_sheet(departmentData);
  const wsDetailed = XLSX.utils.json_to_sheet(detailedLogs);
  const wsLeaves = XLSX.utils.json_to_sheet(leaveDetailedRecords);
  XLSX.utils.book_append_sheet(wb, wsIndividual, "Individual Summary");
  XLSX.utils.book_append_sheet(wb, wsDepartment, "Department Summary");
  XLSX.utils.book_append_sheet(wb, wsDetailed, "Daily Attendance Logs");
  XLSX.utils.book_append_sheet(wb, wsLeaves, "Leave Detailed Records");
  XLSX.writeFile(wb, `HAND_SE_Report_${startDate}_to_${endDate}.xlsx`);
};

export const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};