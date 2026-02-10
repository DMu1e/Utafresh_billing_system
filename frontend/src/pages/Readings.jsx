import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, X } from 'lucide-react';

export default function Readings() {
    const [readings, setReadings] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const { register, handleSubmit, reset, formState: { errors } } = useForm();

    const fetchReadings = () => {
        api.get('/readings')
            .then((res) => setReadings(res.data.data))
            .catch(() => toast.error('Failed to load readings'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchReadings();
        api.get('/tenants', { params: { status: 'active' } })
            .then((res) => setTenants(res.data.data));
    }, []);

    const onSubmit = async (data) => {
        try {
            const res = await api.post('/readings', {
                ...data,
                tenant_id: parseInt(data.tenant_id),
                reading_value: parseInt(data.reading_value),
            });
            if (res.data.warning) {
                toast(res.data.warning, { icon: '⚠️', duration: 5000 });
            }
            toast.success('Reading recorded');
            reset();
            setShowForm(false);
            fetchReadings();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to record reading');
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Meter Readings</h1>
                <button
                    onClick={() => { reset(); setShowForm(true); }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                >
                    <Plus size={16} /> New Reading
                </button>
            </div>

            {/* New Reading Form */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Record Meter Reading</h2>
                            <button onClick={() => { setShowForm(false); reset(); }} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tenant *</label>
                                <select
                                    {...register('tenant_id', { required: 'Select a tenant' })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">Select tenant...</option>
                                    {tenants.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} — Meter: {t.meter_number}
                                        </option>
                                    ))}
                                </select>
                                {errors.tenant_id && <p className="text-red-500 text-xs mt-1">{errors.tenant_id.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Current Reading *</label>
                                <input
                                    type="number"
                                    {...register('reading_value', { required: 'Required', min: { value: 0, message: 'Must be positive' } })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. 766"
                                />
                                {errors.reading_value && <p className="text-red-500 text-xs mt-1">{errors.reading_value.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reading Date *</label>
                                <input
                                    type="date"
                                    {...register('reading_date', { required: 'Required' })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                {errors.reading_date && <p className="text-red-500 text-xs mt-1">{errors.reading_date.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    {...register('notes')}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Optional notes..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => { setShowForm(false); reset(); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                                    Save Reading
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Readings Table */}
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
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Reading</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Recorded By</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {readings.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                                            No readings recorded yet.
                                        </td>
                                    </tr>
                                ) : (
                                    readings.map((r) => (
                                        <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">{r.tenant_name}</td>
                                            <td className="px-4 py-3 text-gray-600">{r.meter_number}</td>
                                            <td className="px-4 py-3 font-mono font-medium text-gray-900">{r.reading_value}</td>
                                            <td className="px-4 py-3 text-gray-600">{r.reading_date}</td>
                                            <td className="px-4 py-3 text-gray-600">{r.recorded_by_name || '—'}</td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">{r.notes || '—'}</td>
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
