import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Trash2, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';
import { 
  getAllTransactions, 
  deleteTransaction, 
  clearTransactions,
  getByAccountNumber,
  getByTransactionDate,
  getTransactionCount
} from '../services/idb/transactionsRepo';
import type { DBTransaction } from '../utils/parseCSV';

type SortField = keyof DBTransaction;
type SortDirection = 'asc' | 'desc';
type FilterType = 'all' | 'account' | 'date';

interface TransactionsTableProps {
  onRefresh?: () => void;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({ onRefresh }) => {
  const [transactions, setTransactions] = useState<DBTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterValue, setFilterValue] = useState('');
  
  // Sorting states
  const [sortField, setSortField] = useState<SortField>('transactionDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Load transactions
  const loadTransactions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let data: DBTransaction[];
      
      // Apply filtering by index if specified
      if (filterType === 'account' && filterValue.trim()) {
        data = await getByAccountNumber(filterValue.trim());
      } else if (filterType === 'date' && filterValue.trim()) {
        data = await getByTransactionDate(filterValue.trim());
      } else {
        data = await getAllTransactions();
      }
      
      setTransactions(data);
      
      // Get total count
      const count = await getTransactionCount();
      setTotalCount(count);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete transaction
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
      await deleteTransaction(id);
      await loadTransactions(); // Refresh the list
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete transaction');
    }
  };

  // Handle clear all transactions
  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL transactions? This cannot be undone.')) return;
    
    try {
      await clearTransactions();
      await loadTransactions(); // Refresh the list
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear transactions');
    }
  };

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Apply search, sort, and pagination
  const processedTransactions = useMemo(() => {
    let filtered = [...transactions];
    
    // Apply search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(transaction => 
        Object.values(transaction).some(value => 
          String(value).toLowerCase().includes(term)
        )
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = String(a[sortField]).toLowerCase();
      const bValue = String(b[sortField]).toLowerCase();
      
      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue, undefined, { numeric: true });
      } else {
        return bValue.localeCompare(aValue, undefined, { numeric: true });
      }
    });
    
    return filtered;
  }, [transactions, searchTerm, sortField, sortDirection]);

  // Get paginated data
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [processedTransactions, currentPage, itemsPerPage]);

  // Pagination calculations
  const totalPages = Math.ceil(processedTransactions.length / itemsPerPage);

  // Apply filter and reload data
  const applyFilter = async () => {
    setCurrentPage(1); // Reset to first page
    await loadTransactions();
  };

  // Clear filter
  const clearFilter = () => {
    setFilterType('all');
    setFilterValue('');
    setSearchTerm('');
    setCurrentPage(1);
    loadTransactions();
  };

  // Format currency
  const formatCurrency = (amount: string, currency: 'CAD' | 'USD') => {
    if (!amount || amount.trim() === '') return '-';
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    return `${currency} $${num.toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadTransactions();
  }, []);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="w-4 h-4 opacity-30" />;
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-blue-600" />
      : <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  return (
    <div className="w-full space-y-4">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-gray-800">Transactions</h2>
          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
            {processedTransactions.length} of {totalCount}
          </span>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={loadTransactions}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm border space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {/* Filter */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Transactions</option>
              <option value="account">Account Number</option>
              <option value="date">Transaction Date</option>
            </select>
          </div>
          
          {filterType !== 'all' && (
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {filterType === 'account' ? 'Account Number:' : 'Date (YYYY-MM-DD):'}
              </label>
              <input
                type={filterType === 'date' ? 'date' : 'text'}
                placeholder={filterType === 'account' ? 'Enter account number' : 'YYYY-MM-DD'}
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={applyFilter}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              <Filter className="w-4 h-4" />
              Apply
            </button>
            
            {(filterType !== 'all' || searchTerm) && (
              <button
                onClick={clearFilter}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading transactions...</span>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    { key: 'accountType' as SortField, label: 'Account Type' },
                    { key: 'accountNumber' as SortField, label: 'Account Number' },
                    { key: 'transactionDate' as SortField, label: 'Date' },
                    { key: 'chequeNumber' as SortField, label: 'Cheque #' },
                    { key: 'description1' as SortField, label: 'Description 1' },
                    { key: 'description2' as SortField, label: 'Description 2' },
                    { key: 'cadAmount' as SortField, label: 'CAD Amount' },
                    { key: 'usdAmount' as SortField, label: 'USD Amount' }
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center gap-1">
                        {label}
                        <SortIcon field={key} />
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{transaction.accountType}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{transaction.accountNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatDate(transaction.transactionDate)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{transaction.chequeNumber || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{transaction.description1}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{transaction.description2 || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                        {formatCurrency(transaction.cadAmount, 'CAD')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                        {formatCurrency(transaction.usdAmount, 'USD')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Show</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-gray-700">per page</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, processedTransactions.length)} of {processedTransactions.length} results
                  </span>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    <span className="px-3 py-1 text-sm bg-blue-600 text-white rounded">
                      {currentPage}
                    </span>
                    
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};