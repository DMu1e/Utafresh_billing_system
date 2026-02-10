import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

export default function SettingsPage() {
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editValues, setEditValues] = useState({});

    useEffect(() => {
        api.get('/settings')
            .then((res) => {
                setSettings(res.data.data);
                const values = {};
                res.data.data.forEach((s) => { values[s.setting_name] = s.setting_value; });
                setEditValues(values);
            })
            .catch(() => toast.error('Failed to load settings'))
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async (name) => {
        try {
            await api.put(`/settings/${name}`, { value: editValues[name] });
            toast.success(`"${name}" updated`);
        } catch (err) {
            toast.error('Failed to update setting');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">System Settings</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
                {settings.map((s) => (
                    <div key={s.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-gray-900">{s.setting_name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</h3>
                            <p className="text-xs text-gray-500">{s.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={editValues[s.setting_name] || ''}
                                onChange={(e) => setEditValues({ ...editValues, [s.setting_name]: e.target.value })}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-48 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <button
                                onClick={() => handleSave(s.setting_name)}
                                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                            >
                                <Save size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
