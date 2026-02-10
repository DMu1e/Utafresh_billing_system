import api from '../services/api';
import toast from 'react-hot-toast';

/**
 * Download an Excel export from the API
 * @param {string} endpoint - e.g. '/exports/bills'
 * @param {object} params - query params
 * @param {string} filename - default download filename
 */
export async function downloadExcel(endpoint, params = {}, filename = 'export.xlsx') {
    try {
        const res = await api.get(endpoint, {
            params,
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        toast.success('Export downloaded');
    } catch {
        toast.error('Export failed');
    }
}
