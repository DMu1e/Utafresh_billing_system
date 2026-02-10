import { useState, useEffect } from 'react';
import api from '../services/api';
import { Users, Receipt, CreditCard, AlertTriangle } from 'lucide-react';

function StatCard({ title, value, subtitle, icon: Icon, color }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        yellow: 'bg-yellow-50 text-yellow-600',
        red: 'bg-red-50 text-red-600',
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                    {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-lg ${colors[color]}`}>
                    <Icon size={24} />
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/reports/dashboard')
            .then((res) => setData(res.data.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!data) return <p className="text-gray-500">Failed to load dashboard data.</p>;

    const { tenantCount, billing, disconnectionCount, recentPayments } = data;

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    title="Active Tenants"
                    value={tenantCount}
                    icon={Users}
                    color="blue"
                />
                <StatCard
                    title="Expected Revenue"
                    value={`KES ${billing.total_expected?.toLocaleString()}`}
                    subtitle={`${billing.total_bills} bills this month`}
                    icon={Receipt}
                    color="green"
                />
                <StatCard
                    title="Collected"
                    value={`KES ${billing.total_collected?.toLocaleString()}`}
                    subtitle={`${billing.collection_rate}% collection rate`}
                    icon={CreditCard}
                    color="yellow"
                />
                <StatCard
                    title="Disconnection Flags"
                    value={disconnectionCount}
                    subtitle="Accounts flagged"
                    icon={AlertTriangle}
                    color="red"
                />
            </div>

            {/* Billing Status Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Status (This Month)</h2>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                <span className="text-sm text-gray-600">Paid</span>
                            </div>
                            <span className="text-sm font-semibold">{billing.paid_count}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                <span className="text-sm text-gray-600">Partially Paid</span>
                            </div>
                            <span className="text-sm font-semibold">{billing.partial_count}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-gray-400" />
                                <span className="text-sm text-gray-600">Unpaid</span>
                            </div>
                            <span className="text-sm font-semibold">{billing.unpaid_count}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <span className="text-sm text-gray-600">Overdue</span>
                            </div>
                            <span className="text-sm font-semibold">{billing.overdue_count}</span>
                        </div>
                    </div>
                </div>

                {/* Recent Payments */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments</h2>
                    {recentPayments.length === 0 ? (
                        <p className="text-sm text-gray-400">No payments recorded yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {recentPayments.map((p) => (
                                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{p.tenant_name}</p>
                                        <p className="text-xs text-gray-400">
                                            {p.billing_month}/{p.billing_year}
                                        </p>
                                    </div>
                                    <span className="text-sm font-semibold text-green-600">
                                        KES {p.amount?.toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
