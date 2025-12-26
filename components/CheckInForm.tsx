import React, { useState } from 'react';
import { LocationType, WorkLog, Employee } from '../types';
import { TYPE_COLORS } from '../constants';
import { MapPin, Home, Building2, CheckCircle2, AlertCircle } from 'lucide-react';

interface CheckInFormProps {
  currentLog: WorkLog | undefined;
  currentUser: Employee;
  onCheckIn: (type: LocationType, note?: string) => void;
}

export const CheckInForm: React.FC<CheckInFormProps> = ({ currentLog, currentUser, onCheckIn }) => {
  const [selectedType, setSelectedType] = useState<LocationType | null>(currentLog?.type || null);
  const [note, setNote] = useState(currentLog?.note || '');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showBranches, setShowBranches] = useState(
    currentLog?.type === LocationType.OFFICE_HANDSE || currentLog?.type === LocationType.OFFICE_KRAC
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedType) {
      if (selectedType === LocationType.OFFSITE && !note.trim()) {
        return;
      }
      onCheckIn(selectedType, note);
      setIsSubmitted(true);
      setTimeout(() => setIsSubmitted(false), 3000);
    }
  };

  const isOfficeActive = selectedType === LocationType.OFFICE_HANDSE || selectedType === LocationType.OFFICE_KRAC;
  const isSubmitDisabled = !selectedType || (selectedType === LocationType.OFFSITE && !note.trim());

  const handleOfficeClick = () => {
    setShowBranches(true);
    if (!isOfficeActive) {
      // Default to branch matching base location
      const isKracBase = currentUser.baseLocation?.includes('KRAC');
      setSelectedType(isKracBase ? LocationType.OFFICE_KRAC : LocationType.OFFICE_HANDSE);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Where are you today?</h2>
        <p className="text-slate-500 mt-1">Check in to let your team know your location.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* WFH */}
          <button
            type="button"
            onClick={() => { setSelectedType(LocationType.WFH); setShowBranches(false); }}
            className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200 ${
              selectedType === LocationType.WFH 
                ? `${TYPE_COLORS[LocationType.WFH].border} ${TYPE_COLORS[LocationType.WFH].bg} scale-[1.02] shadow-md ring-2 ring-offset-2 ring-slate-100` 
                : 'border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200'
            }`}
          >
            <div className={`p-3 rounded-full mb-4 ${selectedType === LocationType.WFH ? TYPE_COLORS[LocationType.WFH].solid + ' text-white' : 'bg-white text-slate-400'}`}>
              <Home size={28} />
            </div>
            <span className={`font-semibold ${selectedType === LocationType.WFH ? TYPE_COLORS[LocationType.WFH].text : 'text-slate-600'}`}>
              Work From Home
            </span>
          </button>

          {/* OFFICE (Primary) */}
          <button
            type="button"
            onClick={handleOfficeClick}
            className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200 ${
              isOfficeActive
                ? `border-emerald-200 bg-emerald-50 scale-[1.02] shadow-md ring-2 ring-offset-2 ring-slate-100` 
                : 'border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200'
            }`}
          >
            <div className={`p-3 rounded-full mb-4 ${isOfficeActive ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400'}`}>
              <Building2 size={28} />
            </div>
            <span className={`font-semibold ${isOfficeActive ? 'text-emerald-700' : 'text-slate-600'}`}>
              Office
            </span>
            {isOfficeActive && (
              <span className="text-[10px] font-black text-emerald-600 uppercase mt-1">
                {selectedType === LocationType.OFFICE_HANDSE ? 'HAND SE' : 'KRAC'}
              </span>
            )}
          </button>

          {/* OFFSITE */}
          <button
            type="button"
            onClick={() => { setSelectedType(LocationType.OFFSITE); setShowBranches(false); }}
            className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-200 ${
              selectedType === LocationType.OFFSITE 
                ? `${TYPE_COLORS[LocationType.OFFSITE].border} ${TYPE_COLORS[LocationType.OFFSITE].bg} scale-[1.02] shadow-md ring-2 ring-offset-2 ring-slate-100` 
                : 'border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200'
            }`}
          >
            <div className={`p-3 rounded-full mb-4 ${selectedType === LocationType.OFFSITE ? TYPE_COLORS[LocationType.OFFSITE].solid + ' text-white' : 'bg-white text-slate-400'}`}>
              <MapPin size={28} />
            </div>
            <span className={`font-semibold ${selectedType === LocationType.OFFSITE ? TYPE_COLORS[LocationType.OFFSITE].text : 'text-slate-600'}`}>
              Off-Site
            </span>
          </button>
        </div>

        {/* Branch Drill-down */}
        {showBranches && (
          <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 animate-in slide-in-from-top-2 duration-300">
            <label className="block text-xs font-black text-emerald-600 uppercase tracking-widest mb-4 text-center">
              Please Select Office Branch (กรุณาเลือกสาขา)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setSelectedType(LocationType.OFFICE_HANDSE)}
                className={`py-4 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2 ${
                  selectedType === LocationType.OFFICE_HANDSE
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg'
                    : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                }`}
              >
                {selectedType === LocationType.OFFICE_HANDSE && <CheckCircle2 size={18} />}
                HAND SE
              </button>
              <button
                type="button"
                onClick={() => setSelectedType(LocationType.OFFICE_KRAC)}
                className={`py-4 rounded-xl font-bold text-sm transition-all border-2 flex items-center justify-center gap-2 ${
                  selectedType === LocationType.OFFICE_KRAC
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg'
                    : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                }`}
              >
                {selectedType === LocationType.OFFICE_KRAC && <CheckCircle2 size={18} />}
                KRAC
              </button>
            </div>
          </div>
        )}

        {(selectedType === LocationType.OFFSITE || selectedType === LocationType.WFH) && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {selectedType === LocationType.OFFSITE ? 'Location / Note * (Required)' : 'Note (Optional)'}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={selectedType === LocationType.OFFSITE ? "เช่น ไปหาลูกค้าที่ตึก G Tower (จำเป็นต้องระบุ)" : "เช่น วันนี้เน้นงานโปรเจกต์"}
              className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 min-h-[100px] transition-all ${selectedType === LocationType.OFFSITE && !note.trim() ? 'border-rose-300 ring-rose-100' : 'border-slate-200 focus:ring-slate-500'}`}
            />
            {selectedType === LocationType.OFFSITE && !note.trim() && (
              <p className="mt-2 text-xs font-bold text-rose-500 flex items-center gap-1">
                <AlertCircle size={12} /> โปรดระบุรายละเอียดสถานที่นัดหมายสำหรับ Off-Site
              </p>
            )}
          </div>
        )}

        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 ${
              isSubmitDisabled 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg active:scale-[0.98]'
            }`}
          >
            {currentLog ? 'Update Check-in' : 'Check-in Now'}
          </button>
        </div>

        {isSubmitted && (
          <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 py-3 rounded-lg animate-bounce">
            <CheckCircle2 size={20} />
            <span className="font-medium">Success! Status updated.</span>
          </div>
        )}
      </form>
    </div>
  );
};