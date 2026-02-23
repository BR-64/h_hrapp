
import React, { useState } from 'react';
import { WorkLog, Employee } from '../types';
import { exportToExcel } from '../utils';
import { Download, FileSpreadsheet, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { format, addMonths, endOfMonth } from 'date-fns';

interface ReportExportProps {
  logs: WorkLog[];
  employees: Employee[];
}

export const ReportExport: React.FC<ReportExportProps> = ({ logs, employees }) => {
  // Fix: Replaced startOfMonth with native Date constructor
  const [startDate, setStartDate] = useState(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dept, setDept] = useState('All');

  const handleExport = () => {
    const filteredEmployees = dept === 'All' ? employees : employees.filter(e => e.department === dept);
    exportToExcel(logs, filteredEmployees, startDate, endDate);
  };

  // Fix: Replaced startOfMonth and subMonths with native Date logic and addMonths
  const today = new Date();
  const lastMonth = addMonths(today, -1);
  const presetRanges = [
    { label: 'This Month', start: new Date(today.getFullYear(), today.getMonth(), 1), end: endOfMonth(today) },
    { label: 'Last Month', start: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1), end: endOfMonth(lastMonth) },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl">
          <FileSpreadsheet size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Export Report</h2>
          <p className="text-slate-500">Generate detailed attendance reports in Excel format.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <CalendarIcon size={14} /> Start Date
            </label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <CalendarIcon size={14} /> End Date
            </label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex gap-2">
          {presetRanges.map(range => (
            <button
              key={range.label}
              onClick={() => {
                setStartDate(format(range.start, 'yyyy-MM-dd'));
                setEndDate(format(range.end, 'yyyy-MM-dd'));
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
            >
              {range.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Filter size={14} /> Department Filter
          </label>
          <select 
            value={dept} 
            onChange={e => setDept(e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50"
          >
            <option value="All">All Departments</option>
            {[...new Set(employees.map(e => e.department))].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="pt-6 border-t border-slate-100">
          <button
            onClick={handleExport}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-emerald-100 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Download size={20} />
            Download .XLSX Report
          </button>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Report Content</h4>
          <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
            <li>Daily attendance status per employee</li>
            <li>Summary of WFH, Office, and Off-Site counts</li>
            <li>Attendance percentages and totals</li>
            <li>Formatted for immediate business use</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
