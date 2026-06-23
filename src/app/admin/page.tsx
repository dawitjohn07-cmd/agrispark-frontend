'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAdminOrders, getAdminProducts, getAdminUsers } from '@/lib/api';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { formatMoney } from '@/lib/utils';

interface DashboardStats {
    totalUsers: number;
    activeUsers: number;
    totalFarmers: number;
    totalBuyers: number;
    totalProducts: number;
    activeProducts: number;
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    revenue: number;
}

export default function AdminOverviewPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [revenueByMonth, setRevenueByMonth] = useState<{ month: string; revenue: number }[]>([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalDeliveryFees, setTotalDeliveryFees] = useState(0);
    const [avgOrderValue, setAvgOrderValue] = useState(0);

    useEffect(() => {
        const loadStats = async () => {
            try {
                setError('');

                const [users, products, orders] = await Promise.all([
                    getAdminUsers(),
                    getAdminProducts(),
                    getAdminOrders(),
                ]);

                const safeUsers = users || [];
                const safeProducts = products || [];
                const safeOrders = orders || [];

                const revenueStatuses = new Set(['delivered']);
                const revenue = safeOrders.reduce((sum, order) => {
                    const include = revenueStatuses.has((order.status || '').toLowerCase());
                    const value = Number(order.total_price || 0) * 0.08;
                    return include ? sum + value : sum;
                }, 0);

                // Revenue by month (last 6 months)
                const now = new Date();
                const months: { label: string; year: number; month: number }[] = [];
                for (let i = 5; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    months.push({ label: d.toLocaleString(undefined, { month: 'short' }), year: d.getFullYear(), month: d.getMonth() });
                }

                const revenueByMonth = months.map((m) => {
                    const sum = safeOrders.reduce((s, order) => {
                        const st = (order.status || '').toLowerCase();
                        if (st !== 'delivered') return s;
                        const created = new Date(order.created_at || order.createdAt || 0);
                        if (created.getFullYear() === m.year && created.getMonth() === m.month) {
                            return s + (Number(order.total_price || 0) * 0.08);
                        }
                        return s;
                    }, 0);
                    return { month: m.label, revenue: Number(sum.toFixed(2)) };
                });

                const totalDeliveryFees = safeOrders.reduce((s, o) => s + Number(o.delivery_fee || 0), 0);
                const avgOrderValue = safeOrders.length ? safeOrders.reduce((s, o) => s + Number(o.total_price || 0), 0) / safeOrders.length : 0;

                setRevenueByMonth(revenueByMonth);
                setTotalRevenue(revenue);
                setTotalDeliveryFees(totalDeliveryFees);
                setAvgOrderValue(avgOrderValue);

                setStats({
                    totalUsers: safeUsers.length,
                    activeUsers: safeUsers.filter((user) => user.is_active !== false).length,
                    totalFarmers: safeUsers.filter((user) => user.role === 'farmer').length,
                    totalBuyers: safeUsers.filter((user) => user.role === 'buyer').length,
                    totalProducts: safeProducts.length,
                    activeProducts: safeProducts.filter((product) => product.is_deleted !== true).length,
                    totalOrders: safeOrders.length,
                    completedOrders: safeOrders.filter((order) => (order.status || '').toLowerCase() === 'delivered').length,
                    cancelledOrders: safeOrders.filter((order) => (order.status || '').toLowerCase() === 'cancelled').length,
                    revenue,
                });
            } catch (err: any) {
                setError(err?.message || 'Failed to load overview stats.');
            } finally {
                setLoading(false);
            }
        };

        loadStats();
    }, []);

    const cards = useMemo(() => {
        if (!stats) return [];

        return [
            { label: 'Total Users', value: stats.totalUsers, icon: '👥' },
            { label: 'Active Users', value: stats.activeUsers, icon: '✅' },
            { label: 'Total Farmers', value: stats.totalFarmers, icon: '🌾' },
            { label: 'Total Buyers', value: stats.totalBuyers, icon: '🛒' },
            { label: 'Total Products', value: stats.totalProducts, icon: '📦' },
            { label: 'Active Products', value: stats.activeProducts, icon: '🟢' },
            { label: 'Total Orders', value: stats.totalOrders, icon: '🧾' },
            { label: 'Completed Orders', value: stats.completedOrders, icon: '🚚' },
            { label: 'Cancelled Orders', value: stats.cancelledOrders, icon: '❌' },
            { label: 'Revenue (Confirmed + Delivered)', value: formatMoney(stats.revenue), icon: '💰' },
        ];
    }, [stats]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <p className="text-gray-600">Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-7xl">
                <h1 className="text-3xl font-bold text-gray-900">Admin Overview</h1>
                <p className="mt-1 text-sm text-gray-500">Platform health and business metrics.</p>

                {error && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {cards.map((card) => (
                        <div key={card.label} className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
                            <p className="text-2xl">{card.icon}</p>
                            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{card.label}</p>
                            <p className="mt-2 text-2xl font-bold text-indigo-700">{card.value}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-8 bg-white rounded-lg p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">Platform Revenue (last 6 months)</h2>
                    <div className="mt-4 h-64 overflow-x-auto pb-2">
                        <div className="min-w-[500px] h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={revenueByMonth} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip formatter={(value: any) => formatMoney(Number(value || 0))} />
                                    <Bar dataKey="revenue" fill="#4f46e5" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="rounded-lg border p-4 bg-white">
                            <div className="text-sm text-gray-500">Total Revenue This Month</div>
                            <div className="mt-2 text-2xl font-bold">{formatMoney(revenueByMonth[revenueByMonth.length - 1]?.revenue || 0)}</div>
                        </div>
                        <div className="rounded-lg border p-4 bg-white">
                            <div className="text-sm text-gray-500">Total Revenue All Time</div>
                            <div className="mt-2 text-2xl font-bold">{formatMoney(totalRevenue)}</div>
                        </div>
                        <div className="rounded-lg border p-4 bg-white">
                            <div className="text-sm text-gray-500">Total Delivery Fees Collected</div>
                            <div className="mt-2 text-2xl font-bold">{formatMoney(totalDeliveryFees)}</div>
                        </div>
                        <div className="rounded-lg border p-4 bg-white">
                            <div className="text-sm text-gray-500">Average Order Value</div>
                            <div className="mt-2 text-2xl font-bold">{formatMoney(avgOrderValue)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
