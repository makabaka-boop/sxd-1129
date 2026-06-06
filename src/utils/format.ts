import type { RecordStatus } from '../types';

export const getStatusLabel = (status: RecordStatus): string => {
  const labels: Record<RecordStatus, string> = {
    borrowed: '领用中',
    returned: '已归还',
    overdue: '已超期',
  };
  return labels[status];
};

export const getStatusClass = (status: RecordStatus): string => {
  const classes: Record<RecordStatus, string> = {
    borrowed: 'status-borrowed',
    returned: 'status-returned',
    overdue: 'status-overdue',
  };
  return classes[status];
};

export const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    admin: '管理员',
    user: '普通用户',
    auditor: '审计员',
  };
  return labels[role] || role;
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  return dateStr;
};

export const formatCurrency = (amount: number): string => {
  return `¥${amount.toFixed(2)}`;
};
