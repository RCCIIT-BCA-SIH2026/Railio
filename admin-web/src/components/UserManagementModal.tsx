import React, { useState, useEffect } from 'react';
import { AdminAuthService, AdminProfile } from '../services/authService';
import { Users, Shield, CheckCircle, XCircle, AlertTriangle, RefreshCw, X } from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const list = await AdminAuthService.fetchAllProfiles();
      setUsers(list);
    } catch (err: any) {
      setMsg(`Error loading profiles: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRoleChange = async (targetUserId: string, newRole: 'user' | 'admin' | 'super_admin') => {
    setUpdatingId(targetUserId);
    setMsg(null);
    try {
      await AdminAuthService.executeAdminAction(targetUserId, 'UPDATE_ROLE', newRole);
      setMsg(`User role updated to ${newRole}`);
      await loadUsers();
    } catch (err: any) {
      setMsg(`Failed to update role: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusToggle = async (targetUserId: string, isActive: boolean) => {
    setUpdatingId(targetUserId);
    setMsg(null);
    try {
      const action = isActive ? 'SUSPEND_USER' : 'ACTIVATE_USER';
      await AdminAuthService.executeAdminAction(targetUserId, action);
      setMsg(`User account ${isActive ? 'suspended' : 'activated'}`);
      await loadUsers();
    } catch (err: any) {
      setMsg(`Action failed: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-500/20 text-rail-orange rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base font-heading">User & Role Management</h3>
              <p className="text-xs text-slate-400">Centralized Supabase RBAC & Authorization Control</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadUsers}
              disabled={loading}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              title="Refresh User List"
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

        {/* Notice Message */}
        {msg && (
          <div className="bg-orange-50 border-b border-orange-200 px-6 py-2.5 text-xs text-orange-800 font-semibold flex items-center space-x-2">
            <Shield className="w-4 h-4 text-rail-orange shrink-0" />
            <span>{msg}</span>
          </div>
        )}

        {/* User Table */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <div className="w-8 h-8 border-3 border-rail-orange border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading user registry from Supabase...
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">User / Email</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Phone Verification</th>
                    <th className="p-3">Account Status</th>
                    <th className="p-3 text-right">RBAC Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-semibold text-slate-900">
                        <div>{u.full_name}</div>
                        <div className="text-[11px] text-slate-500 font-normal">{u.email}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                            u.role === 'admin'
                              ? 'bg-amber-100 text-amber-800'
                              : u.role === 'super_admin'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3">
                        {u.phone_verified ? (
                          <span className="text-emerald-600 font-bold flex items-center space-x-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>VERIFIED</span>
                          </span>
                        ) : (
                          <span className="text-amber-600 font-semibold flex items-center space-x-1">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>UNVERIFIED</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {u.is_active !== false ? (
                          <span className="text-emerald-700 font-semibold">Active</span>
                        ) : (
                          <span className="text-red-600 font-bold">Suspended</span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-1.5">
                        {updatingId === u.id ? (
                          <span className="text-slate-400 italic">Updating...</span>
                        ) : (
                          <>
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => handleRoleChange(u.id, 'admin')}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded border border-amber-300 transition text-[11px]"
                              >
                                Promote to Admin
                              </button>
                            )}
                            {u.role === 'admin' && (
                              <button
                                onClick={() => handleRoleChange(u.id, 'user')}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded border border-slate-300 transition text-[11px]"
                              >
                                Demote to User
                              </button>
                            )}
                            <button
                              onClick={() => handleStatusToggle(u.id, u.is_active !== false)}
                              className={`px-2.5 py-1 rounded font-semibold transition text-[11px] ${
                                u.is_active !== false
                                  ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {u.is_active !== false ? 'Suspend' : 'Activate'}
                            </button>
                          </>
                        )}
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
