import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePayroll } from '../../hooks/usePayroll';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  Table,
  Download,
  AlertTriangle,
  User,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { downloadCSV } from '../../utils/payrollUtils';

const PayrollReport: React.FC = () => {
  const { t } = useTranslation();
  const { currentCompany } = useAuth();
  const { loading, payrollData, getReportData } = usePayroll(currentCompany?.id || '');

  // Initialize with current month
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );

  useEffect(() => {
    if (currentCompany) {
      loadReport();
    }
  }, [currentCompany]);

  const loadReport = async () => {
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const date = new Date(year, month - 1, 1);
      await getReportData(date);
    } catch (error) {
      console.error('Error loading payroll report:', error);
      toast.error(t('common.error'));
    }
  };

  const handleExportCSV = () => {
    if (payrollData.length === 0) {
      toast.error(t('payroll.noDataToExport'));
      return;
    }

    const [year, month] = selectedMonth.split('-').map(Number);

    const csvData = payrollData.map((row) => ({
      [t('payroll.csv.employeeId')]: row.employeeId,
      [t('payroll.csv.name')]: row.displayName,
      [t('payroll.csv.email')]: row.email,
      [t('payroll.csv.startDate')]: row.startDate,
      [t('payroll.csv.weeklyHours')]: row.weeklyHours,
      [t('payroll.csv.targetHoursMonth')]: row.targetHoursMonth.toFixed(2),
      [t('payroll.csv.actualHoursMonth')]: row.actualHoursMonth.toFixed(2),
      [t('payroll.csv.balanceMonth')]: row.balanceMonth.toFixed(2),
      [t('payroll.csv.sickDaysMonth')]: row.sickDaysMonth,
      [t('payroll.csv.vacationDaysMonth')]: row.vacationDaysMonth,
      [t('payroll.csv.lifetimeBalance')]: row.lifetimeBalance.toFixed(2),
    }));

    const filename = `lohnbuchhaltung_${year}_${String(month).padStart(2, '0')}.csv`;
    downloadCSV(csvData, filename);
    toast.success(t('payroll.exportSuccess'));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Table className="w-6 h-6" />
            {t('payroll.title')}
          </h1>
          <p className="text-gray-600 mt-1">{t('payroll.subtitle')}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Month Selector */}
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            disabled={loading || payrollData.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-5 h-5" />
            {t('payroll.exportCSV')}
          </button>

          {/* Load Report Button */}
          <button
            onClick={loadReport}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Table className="w-5 h-5" />
            )}
            {t('payroll.loadReport')}
          </button>
        </div>
      </div>

      {/* Report Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : payrollData.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Table className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">{t('payroll.noData')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('payroll.table.employee')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('payroll.table.targetHours')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('payroll.table.actualHours')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('payroll.table.balance')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('payroll.table.sickDays')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('payroll.table.vacationDays')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('payroll.table.lifetimeBalance')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payrollData.map((row) => (
                  <tr key={row.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {row.displayName}
                            </p>
                            {(row.missingEmployeeId || row.missingStartDate) && (
                              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {row.employeeId || t('payroll.noEmployeeId')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {row.targetHoursMonth.toFixed(1)}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {row.actualHoursMonth.toFixed(1)}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span
                        className={`text-sm font-medium ${
                          row.balanceMonth > 0
                            ? 'text-green-600'
                            : row.balanceMonth < 0
                            ? 'text-red-600'
                            : 'text-gray-900'
                        }`}
                      >
                        {row.balanceMonth > 0 ? '+' : ''}
                        {row.balanceMonth.toFixed(1)}h
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {row.sickDaysMonth}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {row.vacationDaysMonth}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {row.lifetimeBalance > 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : row.lifetimeBalance < 0 ? (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        ) : null}
                        <span
                          className={`text-sm font-bold ${
                            row.lifetimeBalance > 0
                              ? 'text-green-600'
                              : row.lifetimeBalance < 0
                              ? 'text-red-600'
                              : 'text-gray-900'
                          }`}
                        >
                          {row.lifetimeBalance > 0 ? '+' : ''}
                          {row.lifetimeBalance.toFixed(1)}h
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {payrollData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">{t('payroll.stats.totalEmployees')}</p>
            <p className="text-2xl font-bold text-gray-900">{payrollData.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">{t('payroll.stats.totalTargetHours')}</p>
            <p className="text-2xl font-bold text-gray-900">
              {payrollData.reduce((sum, row) => sum + row.targetHoursMonth, 0).toFixed(1)}h
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">{t('payroll.stats.totalActualHours')}</p>
            <p className="text-2xl font-bold text-gray-900">
              {payrollData.reduce((sum, row) => sum + row.actualHoursMonth, 0).toFixed(1)}h
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">{t('payroll.stats.totalBalance')}</p>
            <p
              className={`text-2xl font-bold ${
                payrollData.reduce((sum, row) => sum + row.balanceMonth, 0) > 0
                  ? 'text-green-600'
                  : payrollData.reduce((sum, row) => sum + row.balanceMonth, 0) < 0
                  ? 'text-red-600'
                  : 'text-gray-900'
              }`}
            >
              {payrollData.reduce((sum, row) => sum + row.balanceMonth, 0) > 0 ? '+' : ''}
              {payrollData.reduce((sum, row) => sum + row.balanceMonth, 0).toFixed(1)}h
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollReport;
