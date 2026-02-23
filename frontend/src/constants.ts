import { LocationType, LeaveType, LeaveBalance, CompanyHoliday } from './types';
import { isWeekend, format } from 'date-fns';

export const DEFAULT_BALANCES: LeaveBalance = {
  [LeaveType.SICK]: 30,
  [LeaveType.ANNUAL]: 6,
  [LeaveType.PERSONAL]: 4,
  [LeaveType.COMPENSATION]: 0,
  [LeaveType.MATERNITY_1]: 60,
  [LeaveType.MATERNITY_2]: 60,
  [LeaveType.TRAINING]: 30,
  [LeaveType.STERILIZATION]: 5,
  [LeaveType.ORDINATION]: 15,
  [LeaveType.UNPAID]: 30,
  [LeaveType.CHILD_CARE]: 15,
};

export const isWorkingDay = (date: Date, holidays: CompanyHoliday[] = []): boolean => {
  const dateStr = format(date, 'yyyy-MM-dd');
  const holidayDates = holidays.map(h => h.date);
  return !isWeekend(date) && !holidayDates.includes(dateStr);
};

export const TYPE_COLORS = {
  [LocationType.WFH]: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    solid: 'bg-blue-500',
  },
  [LocationType.OFFICE_HANDSE]: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    solid: 'bg-emerald-500',
  },
  [LocationType.OFFICE_KRAC]: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    solid: 'bg-emerald-500',
  },
  [LocationType.OFFSITE]: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    border: 'border-orange-200',
    solid: 'bg-orange-500',
  },
};
