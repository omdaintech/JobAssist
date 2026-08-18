import {
  ArrowPathIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { AdminErrorDisplay } from '../components/ui/admin-error-display';
import { AdminLoadingState } from '../components/ui/admin-loading-state';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAdminAuth } from '../hooks/useAdminAuth';
import {
  ManualCaptureRequest,
  ManualTopupRequest,
  PaymentTransaction,
  PaymentTransactionDetail,
  ResendEmailRequest,
  adminApi,
} from '../services/adminApi';
import {
  ADMIN_BUTTON_TEXTS,
  formatAdminDate,
  handleAdminErrors,
} from '../utils/admin-frontend-utils';

// Status badge styling
const getStatusBadge = (status: string) => {
  const styles = {
    completed: 'bg-green-100 text-green-800',
    created: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };
  const classes = styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {status.toUpperCase()}
    </span>
  );
};

export default function PaymentManagementPage() {
  const { token } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Initialize statusFilter from URL
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const params = new URLSearchParams(location.search);
    return params.get('status') || '';
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User search states
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [searchedUsers, setSearchedUsers] = useState<any[]>([]);
  const [showUserSearchResults, setShowUserSearchResults] = useState(false);

  // Modal states
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransactionDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('');

  // Action states
  const [captureLoading, setCaptureLoading] = useState(false);
  const [topupLoading, setTopupLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  // Form states
  const [topupCredits, setTopupCredits] = useState<number>(50);
  const [topupReason, setTopupReason] = useState<string>('');
  const [sendEmail, setSendEmail] = useState<boolean>(true);

  // Set page title
  useEffect(() => {
    document.title = 'Payment Management | lingali Admin';
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter]);

  const filteredTransactions = useMemo(() => {
    if (!searchTerm.trim()) return transactions;

    const search = searchTerm.toLowerCase();
    return transactions.filter((txn) =>
      [
        txn.user_email,
        txn.user_name,
        txn.gateway_order_id,
        txn.id,
      ]
        .filter(Boolean)
        .some((field) => field?.toLowerCase().includes(search))
    );
  }, [transactions, searchTerm]);

  const fetchTransactions = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await adminApi.getPaymentOrders(token, {
        status: statusFilter || undefined,
        limit: 100,
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      if (response.success && response.data) {
        setTransactions(response.data.transactions || []);
      } else {
        setError(response.message || 'Failed to load payment transactions');
      }
    } catch (err) {
      const errorMsg = handleAdminErrors(err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionDetails = async (transactionId: string) => {
    if (!token) return;

    try {
      setDetailsLoading(true);
      const response = await adminApi.getPaymentOrderDetails(token, transactionId);

      if (response.success && response.data) {
        setSelectedTransaction(response.data.transaction);
        setShowDetailsModal(true);
      } else {
        alert(response.message || 'Failed to load transaction details');
      }
    } catch (err: any) {
      const errorMsg = handleAdminErrors(err);
      alert(errorMsg);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCapturePayment = async (transactionId: string) => {
    if (!token) return;
    if (!confirm('Are you sure you want to manually capture this payment? Credits will be added to the user account.')) {
      return;
    }

    try {
      setCaptureLoading(true);
      const request: ManualCaptureRequest = {
        send_email: sendEmail,
        notes: 'Manual capture by admin',
      };

      const response = await adminApi.capturePayment(token, transactionId, request);

      if (response.success) {
        alert(
          `✅ Payment captured successfully!\n\n` +
          `Credits Added: ${response.data?.data.credits_added}\n` +
          `User Total Credits: ${response.data?.data.user_total_credits}\n` +
          `Email Sent: ${response.data?.data.email_sent ? 'Yes' : 'No'}`
        );
        setShowDetailsModal(false);
        fetchTransactions();
      } else {
        alert(`❌ Failed to capture payment: ${response.message}`);
      }
    } catch (err: any) {
      const errorMsg = handleAdminErrors(err);
      alert(`❌ Error: ${errorMsg}`);
    } finally {
      setCaptureLoading(false);
    }
  };

  const handleTopupCredits = async () => {
    if (!token || !selectedUserId) return;
    if (!topupReason.trim() || topupReason.length < 5) {
      alert('Please provide a reason (at least 5 characters)');
      return;
    }
    if (topupCredits <= 0) {
      alert('Please enter a positive number of credits');
      return;
    }

    try {
      setTopupLoading(true);
      const request: ManualTopupRequest = {
        credits: topupCredits,
        reason: topupReason,
        send_email: sendEmail,
      };

      const response = await adminApi.topupUserCredits(token, selectedUserId, request);

      if (response.success) {
        alert(
          `✅ Credits added successfully!\n\n` +
          `Credits Added: ${response.data?.data.credits_added}\n` +
          `New Total: ${response.data?.data.new_total_credits}\n` +
          `Remaining: ${response.data?.data.remaining_credits}\n` +
          `Email Sent: ${response.data?.data.email_sent ? 'Yes' : 'No'}`
        );
        setShowTopupModal(false);
        setTopupCredits(50);
        setTopupReason('');
        fetchTransactions();
      } else {
        alert(`❌ Failed to add credits: ${response.message}`);
      }
    } catch (err: any) {
      const errorMsg = handleAdminErrors(err);
      alert(`❌ Error: ${errorMsg}`);
    } finally {
      setTopupLoading(false);
    }
  };

  const handleResendEmail = async (transactionId: string) => {
    if (!token) return;
    if (!confirm('Resend confirmation email to user?')) {
      return;
    }

    try {
      setEmailLoading(true);
      const request: ResendEmailRequest = {
        email_type: 'payment_success',
      };

      const response = await adminApi.resendPaymentEmail(token, transactionId, request);

      if (response.success) {
        alert(`✅ Email sent to ${response.data?.data.recipient}`);
      } else {
        alert(`❌ Failed to send email: ${response.message}`);
      }
    } catch (err: any) {
      const errorMsg = handleAdminErrors(err);
      alert(`❌ Error: ${errorMsg}`);
    } finally {
      setEmailLoading(false);
    }
  };

  const openTopupModal = (userId: string, userEmail: string) => {
    setSelectedUserId(userId);
    setSelectedUserEmail(userEmail);
    setTopupCredits(50);
    setTopupReason('');
    setSendEmail(true);
    setShowTopupModal(true);
  };

  const handleSearchB2CUsers = async () => {
    if (!token || !userSearchTerm.trim() || userSearchTerm.trim().length < 2) {
      alert('Please enter at least 2 characters to search');
      return;
    }

    try {
      setSearchingUsers(true);
      const response = await adminApi.searchB2CUsers(token, userSearchTerm.trim(), 20);

      if (response.success && response.data) {
        setSearchedUsers(response.data.users || []);
        setShowUserSearchResults(true);
      } else {
        alert(response.message || 'Failed to search users');
      }
    } catch (err: any) {
      const errorMsg = handleAdminErrors(err);
      alert(`❌ Search error: ${errorMsg}`);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleUserSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchB2CUsers();
    }
  };

  if (loading) {
    return <AdminLoadingState message="Loading payment transactions..." />;
  }

  if (error) {
    return <AdminErrorDisplay message={error} onRetry={fetchTransactions} />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <BanknotesIcon className="w-8 h-8" />
          Payment Management
        </h1>
        <p className="text-gray-600 mt-2">
          Manage B2C payment transactions, capture stuck payments, and add promotional credits
        </p>
      </div>

      {/* Search Any B2C User Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-6 mb-6 border-2 border-blue-200">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <PlusIcon className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Add Free Credits to Any B2C User
            </h2>
            <p className="text-gray-600 text-sm">
              Search for any B2C customer (even those without payment history) and add promotional credits
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search user by email or name (min 2 characters)..."
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
              onKeyPress={handleUserSearchKeyPress}
              className="pl-10"
            />
          </div>
          <Button
            onClick={handleSearchB2CUsers}
            disabled={searchingUsers || userSearchTerm.trim().length < 2}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            {searchingUsers ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="w-4 h-4" />
                Search Users
              </>
            )}
          </Button>
        </div>

        {/* User Search Results */}
        {showUserSearchResults && (
          <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">
                Search Results ({searchedUsers.length} users found)
              </h3>
              <button
                onClick={() => setShowUserSearchResults(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {searchedUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No users found matching "{userSearchTerm}"
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Credits
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {searchedUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {user.remaining_credits} / {user.current_credits}
                            </div>
                            <div className="text-xs text-gray-500">
                              Used: {user.used_credits}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {user.is_active ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            onClick={() => openTopupModal(user.id, user.email)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 ml-auto"
                          >
                            <PlusIcon className="w-4 h-4" />
                            Add Credits
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by email, name, order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              const newStatus = e.target.value;
              setStatusFilter(newStatus);
              
              // Update URL with status filter
              const params = new URLSearchParams(location.search);
              if (newStatus) {
                params.set('status', newStatus);
              } else {
                params.delete('status');
              }
              const newUrl = params.toString() 
                ? `${location.pathname}?${params.toString()}`
                : location.pathname;
              navigate(newUrl, { replace: true });
            }}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="created">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Refresh */}
          <Button
            onClick={fetchTransactions}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            {ADMIN_BUTTON_TEXTS.refresh}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
            </div>
            <BanknotesIcon className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {transactions.filter((t) => t.status === 'completed').length}
              </p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {transactions.filter((t) => t.status === 'created').length}
              </p>
            </div>
            <ClockIcon className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-red-600">
                {transactions.filter((t) => t.status === 'failed').length}
              </p>
            </div>
            <XCircleIcon className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order Info
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No transactions found
                </td>
              </tr>
            ) : (
              filteredTransactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        {txn.gateway_order_id}
                      </div>
                      <div className="text-gray-500">{txn.pricing_pack_name || 'N/A'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{txn.user_name}</div>
                      <div className="text-gray-500">{txn.user_email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        {txn.amount_value} {txn.currency_code}
                      </div>
                      <div className="text-gray-500">{txn.credits_purchased} credits</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(txn.status)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div>{formatAdminDate(txn.created_at)}</div>
                    {txn.completed_at && (
                      <div className="text-xs text-gray-400">
                        Completed: {formatAdminDate(txn.completed_at)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={() => fetchTransactionDetails(txn.id)}
                        variant="outline"
                        size="sm"
                        disabled={detailsLoading}
                      >
                        View Details
                      </Button>
                      <Button
                        onClick={() => openTopupModal(txn.user_id, txn.user_email)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <PlusIcon className="w-4 h-4" />
                        Topup
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {showDetailsModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Transaction Details</h2>
                  <p className="text-gray-600 mt-1">{selectedTransaction.payment.gateway_order_id}</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Status & User Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-2">User Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Name:</span> {selectedTransaction.user.name}</p>
                    <p><span className="font-medium">Email:</span> {selectedTransaction.user.email}</p>
                    <p><span className="font-medium">Current Credits:</span> {selectedTransaction.user.current_credits}</p>
                    <p><span className="font-medium">Used:</span> {selectedTransaction.user.used_credits}</p>
                    <p><span className="font-medium">Remaining:</span> {selectedTransaction.user.remaining_credits}</p>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Payment Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Amount:</span> {selectedTransaction.payment.amount_value} {selectedTransaction.payment.currency_code}</p>
                    <p><span className="font-medium">Credits:</span> {selectedTransaction.payment.credits_purchased}</p>
                    <p><span className="font-medium">Gateway:</span> {selectedTransaction.payment.gateway_provider}</p>
                    <p><span className="font-medium">Status:</span> {getStatusBadge(selectedTransaction.status)}</p>
                    <p><span className="font-medium">Created:</span> {formatAdminDate(selectedTransaction.timestamps.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                {selectedTransaction.status === 'created' && (
                  <Button
                    onClick={() => handleCapturePayment(selectedTransaction.id)}
                    disabled={captureLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {captureLoading ? 'Capturing...' : 'Capture Payment'}
                  </Button>
                )}
                {selectedTransaction.status === 'completed' && (
                  <Button
                    onClick={() => handleResendEmail(selectedTransaction.id)}
                    disabled={emailLoading}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <EnvelopeIcon className="w-4 h-4" />
                    {emailLoading ? 'Sending...' : 'Resend Email'}
                  </Button>
                )}
                <Button
                  onClick={() => openTopupModal(selectedTransaction.user.id, selectedTransaction.user.email)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Credits
                </Button>
                <Button onClick={() => setShowDetailsModal(false)} variant="outline">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Topup Modal */}
      {showTopupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Manual Credit Topup</h2>
                  <p className="text-gray-600 mt-1">{selectedUserEmail}</p>
                </div>
                <button
                  onClick={() => setShowTopupModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credits to Add
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={topupCredits}
                    onChange={(e) => setTopupCredits(parseInt(e.target.value) || 0)}
                    placeholder="50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason (required)
                  </label>
                  <textarea
                    value={topupReason}
                    onChange={(e) => setTopupReason(e.target.value)}
                    placeholder="e.g., Promotional credits for beta testing"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 5 characters</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sendEmailTopup"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="sendEmailTopup" className="text-sm text-gray-700">
                    Send notification email to user
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <Button onClick={() => setShowTopupModal(false)} variant="outline">
                  Cancel
                </Button>
                <Button
                  onClick={handleTopupCredits}
                  disabled={topupLoading || !topupReason.trim() || topupCredits <= 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {topupLoading ? 'Adding Credits...' : 'Add Credits'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
