import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Bell, Check, CheckCheck, Trash2, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

export default function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, unread

    const fetchNotifications = () => {
        setLoading(true);
        const params = filter === 'unread' ? { unread_only: 'true' } : {};
        api.get('/notifications', { params })
            .then((res) => {
                setNotifications(res.data.data.notifications);
                setUnreadCount(res.data.data.unreadCount);
            })
            .catch(() => toast.error('Failed to load notifications'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchNotifications();
    }, [filter]);

    const markRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            fetchNotifications();
        } catch {
            toast.error('Failed to mark as read');
        }
    };

    const markAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            toast.success('All notifications marked as read');
            fetchNotifications();
        } catch {
            toast.error('Failed to mark all as read');
        }
    };

    const cleanupOld = async () => {
        if (!confirm('Delete notifications older than 30 days?')) return;
        try {
            const res = await api.delete('/notifications/cleanup');
            toast.success(res.data.message);
            fetchNotifications();
        } catch {
            toast.error('Cleanup failed');
        }
    };

    const typeIcon = (type) => {
        switch (type) {
            case 'warning': return <AlertTriangle size={20} className="text-yellow-500" />;
            case 'success': return <CheckCircle size={20} className="text-green-500" />;
            case 'error': return <XCircle size={20} className="text-red-500" />;
            default: return <Info size={20} className="text-blue-500" />;
        }
    };

    const typeBg = (type) => {
        switch (type) {
            case 'warning': return 'border-l-yellow-400';
            case 'success': return 'border-l-green-400';
            case 'error': return 'border-l-red-400';
            default: return 'border-l-blue-400';
        }
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHr / 24);

        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHr < 24) return `${diffHr}h ago`;
        if (diffDay < 7) return `${diffDay}d ago`;
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                    {unreadCount > 0 && (
                        <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                            {unreadCount} unread
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                        <option value="all">All</option>
                        <option value="unread">Unread only</option>
                    </select>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllRead}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                        >
                            <CheckCheck size={16} /> Mark All Read
                        </button>
                    )}
                    <button
                        onClick={cleanupOld}
                        className="flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                    >
                        <Trash2 size={16} /> Cleanup
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : notifications.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <Bell size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 text-lg">No notifications</p>
                    <p className="text-gray-400 text-sm mt-1">
                        {filter === 'unread' ? 'All caught up! Switch to "All" to see past notifications.' : 'Automated alerts from your billing system will appear here.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notifications.map((n) => (
                        <div
                            key={n.id}
                            className={`bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${typeBg(n.type)} p-4 flex items-start gap-4 transition hover:shadow-md ${!n.is_read ? 'ring-1 ring-blue-100' : ''}`}
                        >
                            <div className="mt-0.5">{typeIcon(n.type)}</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className={`text-sm font-semibold ${!n.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                                        {n.title}
                                    </h3>
                                    {!n.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                                </div>
                                <p className="text-sm text-gray-500 mt-1">{n.message}</p>
                                <p className="text-xs text-gray-400 mt-2">{formatTime(n.created_at)}</p>
                            </div>
                            {!n.is_read && (
                                <button
                                    onClick={() => markRead(n.id)}
                                    className="shrink-0 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                    title="Mark as read"
                                >
                                    <Check size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
