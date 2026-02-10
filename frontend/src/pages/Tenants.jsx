import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Edit2, X, Trash2, Download, AlertTriangle } from 'lucide-react';
import { downloadExcel } from '../utils/exportExcel';

export default function Tenants() {
    const { user } = useAuth();
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingTenant, setEditingTenant] = useState(null);
    const [search, setSearch] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

    const fetchTenants = () => {
        api.get('/tenants', { params: { search } })
            .then((res) => setTenants(res.data.data))
            .catch(() => toast.error('Failed to load tenants'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchTenants();
    }, [search]);

    const onSubmit = async (data) => {
        try {
            if (editingTenant) {
                await api.put(`/tenants/${editingTenant.id}`, data);
                toast.success('Tenant updated');
            } else {
                await api.post('/tenants', data);
                toast.success('Tenant created');
            }
            reset();
            setShowForm(false);
            setEditingTenant(null);
            fetchTenants();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Operation failed');
        }
    };

    const handleEdit = (tenant) => {
        setEditingTenant(tenant);
        Object.keys(tenant).forEach((key) => setValue(key, tenant[key]));
        setShowForm(true);
    };

    const handleDeactivate = async (id) => {
        if (!confirm('Deactivate this tenant?')) return;
        try {
            await api.delete(`/tenants/${id}`);
            toast.success('Tenant deactivated');
            fetchTenants();
        } catch (err) {
            toast.error('Failed to deactivate tenant');
        }
    };

    const handlePermanentDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await api.delete(`/tenants/${deleteTarget.id}/permanent`);
            toast.success(`"${deleteTarget.name}" permanently deleted`);
            setDeleteTarget(null);
            fetchTenants();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete tenant');
        } finally {
            setDeleting(false);
        }
    };

    const statusBadge = (status) => {
        const styles = {
            active: 'bg-green-100 text-green-700',
            inactive: 'bg-gray-100 text-gray-600',
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.inactive}`}>
                {status}
            </span>
        );
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search tenants..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-64 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <button
                        onClick={() => downloadExcel('/exports/tenants', {}, `tenants_${new Date().toISOString().slice(0, 10)}.xlsx`)}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition whitespace-nowrap"
                    >
                        <Download size={16} /> Export
                    </button>
                    {user?.role === 'admin' && (
                        <button
                            onClick={() => { reset(); setEditingTenant(null); setShowForm(true); }}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition whitespace-nowrap"
                        >
                            <Plus size={16} /> Add Tenant
                        </button>
                    )}
                </div>
            </div>

            {/* Modal Form */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">{editingTenant ? 'Edit Tenant' : 'New Tenant'}</h2>
                            <button onClick={() => { setShowForm(false); setEditingTenant(null); reset(); }} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                <input {...register('name', { required: 'Name is required' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                                <input {...register('phone_number', { required: 'Phone number is required' })} placeholder="+254..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                {errors.phone_number && <p className="text-red-500 text-xs mt-1">{errors.phone_number.message}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Meter Number *</label>
                                    <input {...register('meter_number', { required: 'Required' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Number *</label>
                                    <input {...register('unit_number', { required: 'Required' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Property Name</label>
                                <input {...register('property_name')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Move-in Date *</label>
                                <input type="date" {...register('move_in_date', { required: 'Required' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>

                            {!editingTenant && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Meter Reading *</label>
                                    <input type="number" min="0" {...register('initial_reading', { required: !editingTenant ? 'Meter reading is required' : false })} placeholder="e.g. 1250" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                    {errors.initial_reading && <p className="text-red-500 text-xs mt-1">{errors.initial_reading.message}</p>}
                                    <p className="text-xs text-gray-400 mt-1">The meter reading at the time of registration</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Amount</label>
                                    <input type="number" step="0.01" {...register('deposit_amount')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div className="flex items-end">
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" {...register('deposit_paid')} className="rounded" />
                                        Deposit Paid
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => { setShowForm(false); reset(); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                                    {editingTenant ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Tenants Table */}
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
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Meter</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Unit</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Property</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                                    {user?.role === 'admin' && <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {tenants.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                                            No tenants found. Click "Add Tenant" to get started.
                                        </td>
                                    </tr>
                                ) : (
                                    tenants.map((t) => (
                                        <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                                            <td className="px-4 py-3 text-gray-600">{t.phone_number}</td>
                                            <td className="px-4 py-3 text-gray-600">{t.meter_number}</td>
                                            <td className="px-4 py-3 text-gray-600">{t.unit_number}</td>
                                            <td className="px-4 py-3 text-gray-600">{t.property_name || '—'}</td>
                                            <td className="px-4 py-3">{statusBadge(t.status)}</td>
                                            {user?.role === 'admin' && (
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => handleEdit(t)} className="text-blue-600 hover:text-blue-800" title="Edit">
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button onClick={() => setDeleteTarget(t)} className="text-red-500 hover:text-red-700" title="Delete">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                                <AlertTriangle size={20} className="text-red-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Delete Tenant</h2>
                        </div>

                        <p className="text-sm text-gray-600 mb-2">
                            Are you sure you want to permanently delete <strong>{deleteTarget.name}</strong>?
                        </p>
                        <p className="text-sm text-red-600 mb-6">
                            This will remove the tenant and all their related records (meter readings, bills, payments, SMS logs). This action cannot be undone.
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleting}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePermanentDelete}
                                disabled={deleting}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition"
                            >
                                {deleting ? 'Deleting...' : 'Yes, Delete Permanently'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
