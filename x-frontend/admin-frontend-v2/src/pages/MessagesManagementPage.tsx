import { useState, useEffect } from 'react';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { adminApi } from '../services/adminApi';
import { Button } from '../components/ui/button';
import { AdminLoadingState } from '../components/ui/admin-loading-state';
import { AdminErrorDisplay } from '../components/ui/admin-error-display';
import { AdminErrorHandler } from '../utils/admin-frontend-utils';

interface Message {
  id: string;
  message_type: 'contact' | 'feedback';
  name: string | null;
  email: string;
  subject: string;
  message: string;
  user_id: string | null;
  category: string | null;
  severity: string | null;
  is_read: boolean;
  admin_notes: string | null;
  created_at: string;
}

interface MessageStats {
  total_messages: number;
  contact_messages: number;
  feedback_messages: number;
  unread_messages: number;
  by_category: Record<string, number>;
  by_severity: Record<string, number>;
}

export default function MessagesManagementPage() {
  const { token } = useAdminAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'all' | 'contact' | 'feedback'>('all');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [noteText, setNoteText] = useState('');

  // Set page title
  useEffect(() => {
    document.title = 'Messages Management | lingali Admin';
  }, []);

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token, selectedType]);

  const loadData = async () => {
    if (!token) return;

    setLoading(true);
    AdminErrorHandler.clear(setError);

    const result = await AdminErrorHandler.handleAsync(
      async () => {
        const [messagesResponse, statsResponse] = await Promise.all([
          adminApi.getMessages(token, {
            message_type: selectedType === 'all' ? undefined : selectedType,
            limit: 100,
          }),
          adminApi.getMessageStatistics(token),
        ]);

        if (messagesResponse.success && messagesResponse.data) {
          setMessages(messagesResponse.data.messages);
        }

        if (statsResponse.success && statsResponse.data) {
          setStats(statsResponse.data);
        }

        return true;
      },
      setError,
      'fetching messages'
    );

    setLoading(false);
    return result;
  };

  const handleMarkAsRead = async (messageId: string) => {
    if (!token) return;

    const result = await AdminErrorHandler.handleAsync(
      async () => {
        const response = await adminApi.markMessageAsRead(token, messageId);
        
        if (response.success) {
          setMessages(messages.map(m => 
            m.id === messageId ? { ...m, is_read: true } : m
          ));
          if (selectedMessage?.id === messageId) {
            setSelectedMessage({ ...selectedMessage, is_read: true });
          }
        }
        return response.success;
      },
      setError,
      'marking message as read'
    );

    if (result) {
      await loadData(); // Refresh to update unread count
    }
  };

  const handleAddNote = async (messageId: string) => {
    if (!token || !noteText.trim()) return;

    const result = await AdminErrorHandler.handleAsync(
      async () => {
        const response = await adminApi.addMessageNote(token, messageId, noteText.trim());
        
        if (response.success) {
          const updatedMessage = { ...selectedMessage!, admin_notes: noteText.trim() };
          setMessages(messages.map(m => 
            m.id === messageId ? updatedMessage : m
          ));
          setSelectedMessage(updatedMessage);
          setNoteText('');
        }
        return response.success;
      },
      setError,
      'adding note'
    );

    return result;
  };

  const handleDelete = async (messageId: string) => {
    if (!token || !confirm('Are you sure you want to delete this message?')) return;

    const result = await AdminErrorHandler.handleAsync(
      async () => {
        const response = await adminApi.deleteMessage(token, messageId);
        
        if (response.success) {
          setMessages(messages.filter(m => m.id !== messageId));
          if (selectedMessage?.id === messageId) {
            setSelectedMessage(null);
          }
        }
        return response.success;
      },
      setError,
      'deleting message'
    );

    if (result) {
      await loadData(); // Refresh stats
    }
  };

  if (loading) {
    return <AdminLoadingState message="Loading messages..." />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Messages Management</h1>
        <p className="text-gray-600 mt-1">Manage contact forms and user feedback</p>
      </div>

      {/* Error Display */}
      {error && <AdminErrorDisplay error={error} onDismiss={() => setError(null)} />}

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white shadow rounded-lg p-4">
            <div className="text-sm font-medium text-gray-600">Total Messages</div>
            <div className="text-2xl font-bold mt-2">{stats.total_messages}</div>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <div className="text-sm font-medium text-gray-600">Contact Forms</div>
            <div className="text-2xl font-bold text-blue-600 mt-2">{stats.contact_messages}</div>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <div className="text-sm font-medium text-gray-600">Feedback</div>
            <div className="text-2xl font-bold text-green-600 mt-2">{stats.feedback_messages}</div>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <div className="text-sm font-medium text-gray-600">Unread</div>
            <div className="text-2xl font-bold text-orange-600 mt-2">{stats.unread_messages}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(['all', 'contact', 'feedback'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`${
                selectedType === type
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
            >
              {type === 'all' ? 'All Messages' : type}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages List */}
        <div className="bg-white shadow rounded-lg">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Messages ({messages.length})</h2>
            <p className="text-sm text-gray-600">Click a message to view details</p>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {messages.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No messages found
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedMessage?.id === msg.id ? 'bg-blue-50' : ''
                  } ${!msg.is_read ? 'border-l-4 border-l-blue-500' : ''}`}
                  onClick={() => setSelectedMessage(msg)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 text-xs rounded ${
                          msg.message_type === 'contact' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {msg.message_type}
                        </span>
                        <span className="font-semibold text-sm truncate">
                          {msg.name || msg.email}
                        </span>
                        {!msg.is_read && (
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {msg.subject}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {msg.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {msg.category && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                            {msg.category}
                          </span>
                        )}
                        {msg.severity && (
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            msg.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            msg.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            msg.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {msg.severity}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(msg.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Message Details */}
        <div className="bg-white shadow rounded-lg">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Message Details</h2>
            <p className="text-sm text-gray-600">
              {selectedMessage ? 'View and manage message' : 'Select a message to view details'}
            </p>
          </div>
          <div className="p-6">
            {selectedMessage ? (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs rounded border ${
                        selectedMessage.is_read 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-orange-50 text-orange-700 border-orange-200'
                      }`}>
                        {selectedMessage.is_read ? '✓ Read' : '○ Unread'}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold">{selectedMessage.subject}</h3>
                  </div>
                  <div className="flex gap-2">
                    {!selectedMessage.is_read && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsRead(selectedMessage.id)}
                      >
                        Mark Read
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(selectedMessage.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {/* From Info */}
                <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                  {selectedMessage.name && (
                    <div>
                      <span className="font-medium">From:</span> {selectedMessage.name}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Email:</span> {selectedMessage.email}
                  </div>
                  <div>
                    <span className="font-medium">Date:</span>{' '}
                    {new Date(selectedMessage.created_at).toLocaleString()}
                  </div>
                  {selectedMessage.user_id && (
                    <div>
                      <span className="font-medium">User ID:</span> {selectedMessage.user_id}
                    </div>
                  )}
                </div>

                {/* Category & Severity */}
                {(selectedMessage.category || selectedMessage.severity) && (
                  <div className="flex gap-3">
                    {selectedMessage.category && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Category</p>
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          {selectedMessage.category}
                        </span>
                      </div>
                    )}
                    {selectedMessage.severity && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Priority</p>
                        <span className={`px-2 py-1 text-xs rounded ${
                          selectedMessage.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          selectedMessage.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          selectedMessage.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {selectedMessage.severity}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Message Content */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Message:</p>
                  <div className="border rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap bg-gray-50">
                    {selectedMessage.message}
                  </div>
                </div>

                {/* Admin Notes */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Admin Notes</p>
                  {selectedMessage.admin_notes ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                      {selectedMessage.admin_notes}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Add admin notes..."
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        rows={3}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAddNote(selectedMessage.id)}
                        disabled={!noteText.trim()}
                      >
                        Add Note
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">
                Select a message from the list to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
