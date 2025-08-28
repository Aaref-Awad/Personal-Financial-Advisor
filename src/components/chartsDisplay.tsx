import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Calendar, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { getAllTransactions } from '../services/idb/transactionsRepo';
import type { DBTransaction } from '../utils/parseCSV';

interface MonthlyData {
  month: string;
  moneyIn: number;
  moneyOut: number;
  net: number;
}

interface AccountFlowChartProps {
  onError?: (error: string) => void;
}

export const AccountFlowChart: React.FC<AccountFlowChartProps> = ({ onError }) => {
  const [transactions, setTransactions] = useState<DBTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAccountType, setSelectedAccountType] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // Load transactions from database
  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await getAllTransactions();
      setTransactions(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load transactions';
      onError?.(errorMessage);
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Convert currency amounts to numbers and combine CAD + USD
  const parseAmount = (cadAmount: string, usdAmount: string): number => {
    const cad = cadAmount && cadAmount.trim() !== '' ? parseFloat(cadAmount) : 0;
    const usd = usdAmount && usdAmount.trim() !== '' ? parseFloat(usdAmount) : 0;
    
    // Simple combination - in a real app you might want to convert currencies
    // For now, treating both as equivalent units
    return (isNaN(cad) ? 0 : cad) + (isNaN(usd) ? 0 : usd);
  };

  // Get unique account types for dropdown
  const accountTypes = useMemo(() => {
    const types = [...new Set(transactions.map(t => t.accountType).filter(Boolean))].sort();
    return ['all', ...types];
  }, [transactions]);

  // Get available years
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    transactions.forEach(transaction => {
      try {
        const date = new Date(transaction.transactionDate);
        if (!isNaN(date.getTime())) {
          years.add(date.getFullYear());
        }
      } catch (e) {
        // Skip invalid dates
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Most recent first
  }, [transactions]);

  // Process data for chart
  const chartData = useMemo(() => {
    // Filter transactions by account type and year
    const filteredTransactions = transactions.filter(transaction => {
      // Filter by account type
      if (selectedAccountType !== 'all' && transaction.accountType !== selectedAccountType) {
        return false;
      }
      
      // Filter by year
      try {
        const date = new Date(transaction.transactionDate);
        return !isNaN(date.getTime()) && date.getFullYear() === selectedYear;
      } catch (e) {
        return false;
      }
    });

    // Group by month
    const monthlyTotals: { [key: string]: { in: number; out: number } } = {};
    
    // Initialize all 12 months
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    months.forEach(month => {
      monthlyTotals[month] = { in: 0, out: 0 };
    });

    // Process transactions
    filteredTransactions.forEach(transaction => {
      try {
        const date = new Date(transaction.transactionDate);
        if (isNaN(date.getTime())) return;
        
        const month = months[date.getMonth()];
        const amount = parseAmount(transaction.cadAmount, transaction.usdAmount);
        
        if (amount > 0) {
          monthlyTotals[month].in += amount;
        } else if (amount < 0) {
          monthlyTotals[month].out += Math.abs(amount); // Store as positive for display
        }
      } catch (e) {
        // Skip invalid transactions
      }
    });

    // Convert to chart format
    return months.map(month => ({
      month,
      moneyIn: Math.round(monthlyTotals[month].in * 100) / 100,
      moneyOut: -Math.round(monthlyTotals[month].out * 100) / 100, // Negative for chart display
      net: Math.round((monthlyTotals[month].in - monthlyTotals[month].out) * 100) / 100
    }));
  }, [transactions, selectedAccountType, selectedYear]);

  // Calculate totals for summary
  const yearTotals = useMemo(() => {
    return chartData.reduce(
      (acc, month) => ({
        totalIn: acc.totalIn + month.moneyIn,
        totalOut: acc.totalOut + Math.abs(month.moneyOut),
        netFlow: acc.netFlow + month.net
      }),
      { totalIn: 0, totalOut: 0, netFlow: 0 }
    );
  }, [chartData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{`${label} ${selectedYear}`}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Money In: ${data.moneyIn.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Money Out: ${Math.abs(data.moneyOut).toFixed(2)}</span>
            </div>
            <div className="border-t pt-1">
              <span className={`font-medium ${data.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Net: ${data.net.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Load data on component mount
  useEffect(() => {
    loadTransactions();
  }, []);

  // Update year when available years change
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  return (
    <div className="w-full space-y-4">
      {/* Header with Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-1">Account Cash Flow</h2>
            <p className="text-sm text-gray-600">
              Monthly money flow for {selectedAccountType === 'all' ? 'all account types' : selectedAccountType}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {/* Account Type Selector */}
            <div className="min-w-0 flex-1 sm:flex-initial">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Type:
              </label>
              <select
                value={selectedAccountType}
                onChange={(e) => setSelectedAccountType(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {accountTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Account Types' : type}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Year Selector */}
            <div className="min-w-0 flex-1 sm:flex-initial">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year:
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                disabled={availableYears.length === 0}
                className="w-full sm:w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Refresh Button */}
            <div className="flex items-end">
              <button
                onClick={loadTransactions}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Money In</p>
              <p className="text-2xl font-bold text-green-600">
                ${yearTotals.totalIn.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Money Out</p>
              <p className="text-2xl font-bold text-red-600">
                ${yearTotals.totalOut.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${yearTotals.netFlow >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <Calendar className={`w-5 h-5 ${yearTotals.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Net Flow</p>
              <p className={`text-2xl font-bold ${yearTotals.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${yearTotals.netFlow.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-600">Loading chart data...</p>
            </div>
          </div>
        ) : availableYears.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium mb-1">No Data Available</p>
              <p>Import some transactions to see the cash flow chart.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Monthly Cash Flow - {selectedYear}
              </h3>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>Money In</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span>Money Out</span>
                </div>
              </div>
            </div>
            
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#6b7280"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    tickFormatter={(value) => `$${Math.abs(value)}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="#374151" strokeWidth={2} />
                  <Bar 
                    dataKey="moneyIn" 
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]}
                    name="Money In"
                  />
                  <Bar 
                    dataKey="moneyOut" 
                    fill="#ef4444" 
                    radius={[0, 0, 4, 4]}
                    name="Money Out"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
};