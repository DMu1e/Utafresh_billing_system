import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, X, Download } from 'lucide-react';
import { downloadExcel } from '../utils/exportExcel';

export default function Payments() {
    const [payments, setPayments] = useState([]);
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
    const selectedBillId = watch('bill_id');

    const fetchPayments = () => {
        api.get('/payments')
            .then((res) => setPayments(res.data.data))
            .catch(() => toast.error('Failed to load payments'))
            .finally(() => setLoading(false));
    };

    const fetchUnpaidBills = () => {
        api.get('/bills', { params: { status: 'unpaid' } })
            .then((res) => {
                // also fetch partial bills
                api.get('/bills', { params: { status: 'partial' } }).then((res2) => {
                    setBills([...res.data.data, ...res2.data.data]);
                });
            });
    };

    useEffect(() => {
        fetchPayments();
        fetchUnpaidBills();
    }, []);

    const selectedBill = bills.find((b) => b.id === parseInt(selectedBillId));

    const onSubmit = async (data) => {
        try {
            await api.post('/payments', {
                bill_id: parseInt(data.bill_id),
                tenant_id: selectedBill?.tenant_id,
                amount: parseFloat(data.amount),
                payment_date: data.payment_date,
                payment_method: data.payment_method,
                reference_number: data.reference_number || undefined,
            });
            toast.success('Payment recorded');
            reset();
            setShowForm(false);
            fetchPayments();
            fetchUnpaidBills();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to record payment');
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => downloadExcel('/exports/payments', {}, `payments_${new Date().toISOString().slice(0, 10)}.xlsx`)}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition"
                    >
                        <Download size={16} /> Export Excel
                    </button>
                    <button
                        onClick={() => { reset(); setShowForm(true); }}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                    >
                        <Plus size={16} /> Record Payment
                    </button>
                </div>
            </div>

            {/* Payment Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Record Payment</h2>
                            <button onClick={() => { setShowForm(false); reset(); }} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Bill *</label>
                                <select
                                    {...register('bill_id', { required: 'Select a bill' })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">Select bill...</option>
                                    {bills.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.tenant_name} — {b.billing_month}/{b.billing_year} — KES {b.balance?.toLocaleString()} due
                                        </option>
                                    ))}
                                </select>
                                {errors.bill_id && <p className="text-red-500 text-xs mt-1">{errors.bill_id.message}</p>}
                            </div>

                            {selectedBill && (
                                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                                    <p><span className="text-gray-500">Bill Amount:</span> <strong>KES {selectedBill.total_amount?.toLocaleString()}</strong></p>
                                    <p><span className="text-gray-500">Balance:</span> <strong className="text-red-600">KES {selectedBill.balance?.toLocaleString()}</strong></p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    {...register('amount', { required: 'Required', min: { value: 0.01, message: 'Must be > 0' } })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. 10230"
                                />
                                {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date *</label>
                                <input
                                    type="date"
                                    {...register('payment_date', { required: 'Required' })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                                <select
                                    {...register('payment_method', { required: 'Required' })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">Select method...</option>
                                    <option value="mpesa">M-Pesa</option>
                                    <option value="bank">Bank Transfer</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
                                <input
                                    {...register('reference_number')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. QJK4R5T6YU"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => { setShowForm(false); reset(); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                                    Record Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Payments Table */}
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
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Bill Period</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Method</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Ref</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Recorded By</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                                            No payments recorded yet.
                                        </td>
                                    </tr>
                                ) : (
                                    payments.map((p) => (
                                        <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">{p.tenant_name}</td>
                                            <td className="px-4 py-3 text-gray-600">{p.billing_month}/{p.billing_year}</td>
                                            <td className="px-4 py-3 text-right font-medium text-green-600">KES {p.amount?.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-gray-600">{p.payment_date}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.payment_method === 'mpesa' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {p.payment_method === 'mpesa' ? 'M-Pesa' : 'Bank'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 font-mono text-xs">{p.reference_number || '—'}</td>
                                            <td className="px-4 py-3 text-gray-600">{p.recorded_by_name || '—'}</td>
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
