import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
    LayoutDashboard,
    Users,
    Gauge,
    Receipt,
    CreditCard,
    Settings,
    LogOut,
    Menu,
    X,
    Bell,
    Check,
    AlertTriangle,
    Info,
    CheckCircle,
    XCircle,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'employee'] },
    { path: '/notifications', label: 'Notifications', icon: Bell, roles: ['admin'] },
    { path: '/tenants', label: 'Tenants', icon: Users, roles: ['admin', 'employee'] },
    { path: '/readings', label: 'Readings', icon: Gauge, roles: ['admin', 'employee'] },
    { path: '/billing', label: 'Billing', icon: Receipt, roles: ['admin'] },
    { path: '/payments', label: 'Payments', icon: CreditCard, roles: ['admin', 'employee'] },
    { path: '/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
];

export default function Layout({ children }) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef(null);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const fetchNotifications = () => {
        if (user?.role !== 'admin') return;
        api.get('/notifications')
            .then((res) => {
                setNotifications(res.data.data.notifications);
                setUnreadCount(res.data.data.unreadCount);
            })
            .catch(() => { });
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Poll every minute
        return () => clearInterval(interval);
    }, [user]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const markRead = async (id) => {
        await api.put(`/notifications/${id}/read`);
        fetchNotifications();
    };

    const markAllRead = async () => {
        await api.put('/notifications/read-all');
        fetchNotifications();
    };

    const notifIcon = (type) => {
        switch (type) {
            case 'warning': return <AlertTriangle size={16} className="text-yellow-500 shrink-0" />;
            case 'success': return <CheckCircle size={16} className="text-green-500 shrink-0" />;
            case 'error': return <XCircle size={16} className="text-red-500 shrink-0" />;
            default: return <Info size={16} className="text-blue-500 shrink-0" />;
        }
    };

    const filteredNav = navItems.filter((item) => item.roles.includes(user?.role));

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile header */}
            <div className="lg:hidden bg-white shadow-sm px-4 py-3 flex items-center justify-between">
                <button onClick={() => setSidebarOpen(true)} className="text-gray-600">
                    <Menu size={24} />
                </button>
                <h1 className="text-lg font-bold text-blue-600">Utafresh</h1>
                {user?.role === 'admin' ? (
                    <button onClick={() => setShowNotifications(!showNotifications)} className="relative text-gray-600">
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                ) : <div className="w-6" />}
            </div>

            {/* Sidebar overlay for mobile */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
                    <div className="fixed inset-0 bg-black/50" />
                </div>
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-lg transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="p-6 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-blue-600">Utafresh Billing</h1>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400">
                        <X size={20} />
                    </button>
                </div>

                <nav className="px-4 space-y-1">
                    {filteredNav.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        const isNotif = item.path === '/notifications';
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                            >
                                <Icon size={18} />
                                {item.label}
                                {isNotif && unreadCount > 0 && (
                                    <span className="ml-auto px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full leading-none">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
                    <div className="flex items-center gap-3 px-4 py-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                            {user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="lg:ml-64 min-h-screen">
                {/* Top bar with notification bell (desktop) */}
                {user?.role === 'admin' && (
                    <div className="hidden lg:flex justify-end px-8 pt-4" ref={notifRef}>
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {showNotifications && (
                                <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-[70vh] flex flex-col">
                                    <div className="flex items-center justify-between px-4 py-3 border-b">
                                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                                        {unreadCount > 0 && (
                                            <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                                <Check size={12} /> Mark all read
                                            </button>
                                        )}
                                    </div>
                                    <div className="overflow-y-auto flex-1">
                                        {notifications.length === 0 ? (
                                            <p className="text-sm text-gray-400 text-center py-8">No notifications</p>
                                        ) : (
                                            notifications.map((n) => (
                                                <div
                                                    key={n.id}
                                                    className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                                                    onClick={() => !n.is_read && markRead(n.id)}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        {notifIcon(n.type)}
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm font-medium ${!n.is_read ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</p>
                                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                                                            <p className="text-[10px] text-gray-400 mt-1">
                                                                {new Date(n.created_at).toLocaleString()}
                                                            </p>
                                                        </div>
                                                        {!n.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <div className="p-4 sm:p-6 lg:p-8 lg:pt-2">{children}</div>
            </main>
        </div>
    );
}
