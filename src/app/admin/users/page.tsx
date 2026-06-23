'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getAdminUsers, updateAdminUser, deleteAdminUser } from '@/lib/api';

interface AdminUserRow {
    id: string;
    full_name: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'farmer' | 'buyer'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const fetchUsers = async () => {
        try {
            const data = await getAdminUsers();
            setUsers((data || []) as AdminUserRow[]);
        } catch (err: any) {
            setError(err?.message || 'Failed to load users.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = useMemo(() => {
        const q = search.trim().toLowerCase();

        return users.filter((user) => {
            const matchesSearch =
                !q ||
                (user.full_name || '').toLowerCase().includes(q) ||
                (user.email || '').toLowerCase().includes(q);

            const matchesRole = roleFilter === 'all' ? true : user.role === roleFilter;
            const isActive = user.is_active !== false;
            const matchesStatus =
                statusFilter === 'all'
                    ? true
                    : statusFilter === 'active'
                        ? isActive
                        : !isActive;

            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [users, search, roleFilter, statusFilter]);

    const toggleUserActive = async (user: AdminUserRow, makeActive: boolean) => {
        setActionLoadingId(user.id);

        try {
            await updateAdminUser(user.id, makeActive);

            setUsers((currentUsers) =>
                currentUsers.map((currentUser) =>
                    currentUser.id === user.id ? { ...currentUser, is_active: makeActive } : currentUser
                )
            );
        } catch (err: any) {
            alert(err?.message || 'Failed to update user status.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDeleteUser = async (user: AdminUserRow) => {
        if (!confirm(`Are you absolutely sure you want to permanently delete ${user.full_name || user.email}? This action cannot be undone and will delete all their products, orders, and data.`)) {
            return;
        }

        setActionLoadingId(user.id);

        try {
            await deleteAdminUser(user.id);
            setUsers((currentUsers) => currentUsers.filter((u) => u.id !== user.id));
            alert(`${user.full_name || user.email} has been permanently deleted.`);
        } catch (err: any) {
            alert(err?.message || 'Failed to delete user.');
        } finally {
            setActionLoadingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-7xl">
                <h1 className="text-3xl font-bold text-gray-900">Admin Users</h1>
                <p className="mt-1 text-sm text-gray-500">Search and manage account activation.</p>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by name or email"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                    <select
                        value={roleFilter}
                        onChange={(event) => setRoleFilter(event.target.value as 'all' | 'farmer' | 'buyer')}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    >
                        <option value="all">All Roles</option>
                        <option value="farmer">Farmer</option>
                        <option value="buyer">Buyer</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                {error && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Desktop table */}
                <div className="mt-4 hidden md:block overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                    <table className="w-full">
                        <thead className="bg-indigo-700 text-white">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Role</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Joined</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">Loading users...</td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">No users match current filters.</td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => {
                                    const isActive = user.is_active !== false;
                                    const isLoading = actionLoadingId === user.id;

                                    return (
                                        <tr key={user.id} className="border-t border-gray-100">
                                            <td className="px-4 py-3 text-sm text-gray-900">{user.full_name || '—'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{user.email}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">{user.role}</span>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                                    {isActive ? 'active' : 'inactive'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{new Date(user.created_at).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Link
                                                        href={user.role === 'farmer' ? `/admin/farmer/${user.id}` : `/admin/user/${user.id}`}
                                                        className="rounded bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-200 transition"
                                                    >
                                                        Profile
                                                    </Link>
                                                    <button
                                                        onClick={() => toggleUserActive(user, !isActive)}
                                                        disabled={isLoading}
                                                        className={`rounded px-3 py-1 text-xs font-semibold text-white ${isActive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'} disabled:opacity-50 transition`}
                                                    >
                                                        {isLoading ? '...' : isActive ? 'Deactivate' : 'Reactivate'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user)}
                                                        disabled={isLoading}
                                                        className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition"
                                                    >
                                                        {isLoading ? '...' : 'Delete'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile card stack */}
                <div className="mt-4 md:hidden space-y-3">
                    {loading ? (
                        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center text-sm text-gray-500">Loading users...</div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center text-sm text-gray-500">No users match current filters.</div>
                    ) : (
                        filteredUsers.map((user) => {
                            const isActive = user.is_active !== false;
                            const isLoading = actionLoadingId === user.id;
                            return (
                                <div key={user.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm">{user.full_name || '—'}</p>
                                            <p className="text-xs text-gray-500 break-all">{user.email}</p>
                                        </div>
                                        <span className={`rounded-full px-2 py-1 text-xs font-semibold flex-shrink-0 ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                            {isActive ? 'active' : 'inactive'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <span className="rounded-full bg-gray-100 px-2 py-1 font-semibold text-gray-700">{user.role}</span>
                                        <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <Link
                                            href={user.role === 'farmer' ? `/admin/farmer/${user.id}` : `/admin/user/${user.id}`}
                                            className="rounded bg-indigo-100 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-200 transition min-h-[36px] flex items-center"
                                        >
                                            Profile
                                        </Link>
                                        <button
                                            onClick={() => toggleUserActive(user, !isActive)}
                                            disabled={isLoading}
                                            className={`rounded px-3 py-2 text-xs font-semibold text-white min-h-[36px] ${isActive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'} disabled:opacity-50 transition`}
                                        >
                                            {isLoading ? '...' : isActive ? 'Deactivate' : 'Reactivate'}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user)}
                                            disabled={isLoading}
                                            className="rounded bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition min-h-[36px]"
                                        >
                                            {isLoading ? '...' : 'Delete'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

