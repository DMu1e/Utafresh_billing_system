import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FileText, Download, Send } from 'lucide-react';
import { downloadExcel } from '../utils/exportExcel';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Billing() {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [sendingSMS, setSendingSMS] = useState(false);
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [filterStatus, setFilterStatus] = useState('');

    const fetchBills = () => {
        setLoading(true);
        const params = { month: filterMonth, year: filterYear };
        if (filterStatus) params.status = filterStatus;
        api.get('/bills', { params })
            .then((res) => setBills(res.data.data))
            .catch(() => toast.error('Failed to load bills'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchBills();
    }, [filterMonth, filterYear, filterStatus]);

    const handleGenerate = async () => {
        if (!confirm(`Generate bills for ${months[filterMonth - 1]} ${filterYear}? This will calculate consumption and create bills for all active tenants.`)) return;
        setGenerating(true);
        try {
            const res = await api.post('/bills/generate', { month: filterMonth, year: filterYear });
            toast.success(res.data.message);
            fetchBills();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Bill generation failed');
        } finally {
            setGenerating(false);
        }
    };

    const statusBadge = (status) => {
        const styles = {
            paid: 'bg-green-100 text-green-700',
            partial: 'bg-yellow-100 text-yellow-700',
            unpaid: 'bg-gray-100 text-gray-600',
            overdue: 'bg-red-100 text-red-700',
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || ''}`}>
                {status}
            </span>
        );
    };

    const totalExpected = bills.reduce((acc, b) => acc + b.total_amount, 0);
    const totalCollected = bills.reduce((acc, b) => acc + (b.total_paid || 0), 0);

    return (
        <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => downloadExcel('/exports/bills', { month: filterMonth, year: filterYear }, `bills_${filterYear}_${filterMonth}.xlsx`)}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition"
                    >
                        <Download size={16} /> Export Excel
                    </button>
                    <button
                        onClick={async () => {
                            if (bills.length === 0) return toast.error('No bills to send.');
                            if (!confirm(`Send bill SMS to all tenants for ${months[filterMonth - 1]} ${filterYear}?`)) return;
                            setSendingSMS(true);
                            try {
                                const res = await api.post('/bills/send-sms', { month: filterMonth, year: filterYear });
                                toast.success(res.data.message);
                            } catch (err) {
                                toast.error(err.response?.data?.message || 'Failed to send SMS');
                            } finally {
                                setSendingSMS(false);
                            }
                        }}
                        disabled={sendingSMS || bills.length === 0}
                        className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition"
                    >
                        <Send size={16} />
                        {sendingSMS ? 'Sending...' : 'Send Bills SMS'}
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                        <FileText size={16} />
                        {generating ? 'Generating...' : 'Generate Bills'}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                    {months.map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                    ))}
                </select>
                <input
                    type="number"
                    value={filterYear}
                    onChange={(e) => setFilterYear(parseInt(e.target.value))}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                    <option value="">All Status</option>
                    <option value="paid">Paid</option>
                    <option value="partial">Partial</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="overdue">Overdue</option>
                </select>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg border p-4">
                    <p className="text-sm text-gray-500">Total Bills</p>
                    <p className="text-xl font-bold">{bills.length}</p>
                </div>
                <div className="bg-white rounded-lg border p-4">
                    <p className="text-sm text-gray-500">Expected Revenue</p>
                    <p className="text-xl font-bold text-blue-600">KES {totalExpected.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg border p-4">
                    <p className="text-sm text-gray-500">Collected</p>
                    <p className="text-xl font-bold text-green-600">KES {totalCollected.toLocaleString()}</p>
                </div>
            </div>

            {/* Bills Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tenant</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Meter</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Prev</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Current</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Units</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Paid</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Due</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bills.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" className="px-4 py-8 text-center text-gray-400">
                                            No bills for this period. Enter readings first, then click "Generate Bills".
                                        </td>
                                    </tr>
                                ) : (
                                    bills.map((b) => (
                                        <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">{b.tenant_name}</td>
                                            <td className="px-4 py-3 text-gray-600">{b.meter_number}</td>
                                            <td className="px-4 py-3 text-right font-mono">{b.previous_reading}</td>
                                            <td className="px-4 py-3 text-right font-mono">{b.current_reading}</td>
                                            <td className="px-4 py-3 text-right font-mono font-medium">{b.units_consumed}</td>
                                            <td className="px-4 py-3 text-right font-medium">KES {b.total_amount?.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right text-green-600">{b.total_paid > 0 ? `KES ${b.total_paid?.toLocaleString()}` : '—'}</td>
                                            <td className="px-4 py-3 text-right font-medium text-red-600">{b.balance > 0 ? `KES ${b.balance?.toLocaleString()}` : '—'}</td>
                                            <td className="px-4 py-3">{statusBadge(b.status)}</td>
                                            <td className="px-4 py-3 text-gray-600">{b.due_date}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
