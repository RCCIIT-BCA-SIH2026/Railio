import React, { useState, useEffect } from 'react';
import { AdminAuthService, AdminAuditLog } from '../services/authService';
import { ShieldCheck, RefreshCw, X } from 'lucide-react';

interface AuditLogViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await AdminAuthService.fetchAuditLogs();
      setLogs(data);
    } catch (err) {
      console.warn('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base font-heading">Admin Audit Logs</h3>
              <p className="text-xs text-slate-400">Security & Operational Traceability Trail</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadLogs}
              disabled={loading}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Fetching audit logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No administrative audit logs found.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Admin ID</th>
                    <th className="p-3">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono text-[11px] text-slate-600">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded text-[10px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-500">
                        {log.admin_user_id || 'SYSTEM'}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-700">
                        {JSON.stringify(log.metadata)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
