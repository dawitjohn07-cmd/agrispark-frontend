'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAdminOrders, updateOrder } from '@/lib/api';
import { formatMoney } from '@/lib/utils';

interface OrderRow {
    id: string;
    product_id: string;
    buyer_id: string;
    quantity: number;
    total_price: number;
    status: string;
    created_at: string;
    product_name?: string;
    farmer_name?: string;
    buyer_name?: string;
    delivery_zone?: string;
    delivery_status?: string;
    delivery_fee?: number;
    delivery_address?: string;
    platform_commission?: number;
    farmer_earnings?: number;
    payment_method?: string;
}

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<OrderRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'delivered' | 'cancelled'>('all');
    const [savingId, setSavingId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const orderRows = await getAdminOrders();
                setOrders((orderRows || []) as OrderRow[]);
            } catch (err: any) {
                setError(err?.message || 'Failed to load orders.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            if (statusFilter === 'all') return true;
            return (order.status || '').toLowerCase() === statusFilter;
        });
    }, [orders, statusFilter]);

    const handleDeliveryStatusChange = async (orderId: string, newStatus: string) => {
        setSavingId(orderId);
        try {
            await updateOrder(orderId, { delivery_status: newStatus });
            setOrders((prev) =>
                prev.map((o) => (o.id === orderId ? { ...o, delivery_status: newStatus } : o))
            );
            showToast('success', 'Delivery status updated successfully.');
        } catch (err: any) {
            showToast('error', err?.message || 'Failed to update delivery status.');
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-7xl">
                <h1 className="text-3xl font-bold text-gray-900">Admin Orders</h1>
                <p className="mt-1 text-sm text-gray-500">Monitor all orders and manage delivery statuses.</p>

                {/* Toast notification */}
                {toast && (
                    <div className={`fixed top-4 right-4 z-50 rounded-lg px-5 py-3 text-sm font-semibold shadow-lg transition-all ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                        {toast.message}
                    </div>
                )}

                <div className="mt-4 max-w-xs">
                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value as 'all' | 'pending' | 'confirmed' | 'delivered' | 'cancelled')}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>

                {error && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Desktop table */}
                <div className="mt-4 hidden md:block overflow-x-auto overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <table className="w-full">
                        <thead className="bg-indigo-700 text-white">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Order ID</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Buyer</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Product</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Farmer</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold">Qty</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold">Total</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold">Payment</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold">Delivery Status</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-6 text-center text-sm text-gray-500">Loading orders...</td>
                                </tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-6 text-center text-sm text-gray-500">No orders match selected status.</td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => {
                                    const status = (order.status || '').toLowerCase();
                                    const isSaving = savingId === order.id;

                                    return (
                                        <tr key={order.id} className="border-t border-gray-100 hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-mono text-gray-800">{order.id.slice(0, 8)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{order.buyer_name || 'Unknown'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{order.product_name || 'Unknown'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{order.farmer_name || 'Unknown'}</td>
                                            <td className="px-4 py-3 text-center text-sm text-gray-700">{order.quantity}</td>
                                            <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{formatMoney(order.total_price || 0)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${status === 'confirmed' || status === 'delivered' ? 'bg-blue-100 text-blue-700' : status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs text-gray-600">
                                                {order.payment_method || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <select
                                                    value={order.delivery_status || 'pending'}
                                                    disabled={isSaving}
                                                    onChange={(e) => handleDeliveryStatusChange(order.id, e.target.value)}
                                                    className={`rounded border px-2 py-1 text-sm outline-none focus:border-indigo-500 ${isSaving ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="picked_up">Picked Up</option>
                                                    <option value="in_transit">In Transit</option>
                                                    <option value="delivered">Delivered</option>
                                                </select>
                                                {isSaving && (
                                                    <div className="text-xs text-indigo-500 mt-1">Saving...</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{new Date(order.created_at).toLocaleDateString()}</td>
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
                        <div className="rounded-lg border bg-white p-4 text-center text-sm text-gray-500">Loading orders...</div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="rounded-lg border bg-white p-4 text-center text-sm text-gray-500">No orders match selected status.</div>
                    ) : (
                        filteredOrders.map((order) => {
                            const status = (order.status || '').toLowerCase();
                            const isSaving = savingId === order.id;
                            return (
                                <div key={order.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-mono text-xs text-gray-600">{order.id.slice(0, 8)}</p>
                                            <p className="font-semibold text-gray-900 text-sm">{order.product_name || 'Unknown'}</p>
                                            <p className="text-xs text-gray-500">Buyer: {order.buyer_name || 'Unknown'} &bull; Farmer: {order.farmer_name || 'Unknown'}</p>
                                        </div>
                                        <span className={`rounded-full px-2 py-1 text-xs font-semibold flex-shrink-0 ${status === 'confirmed' || status === 'delivered' ? 'bg-blue-100 text-blue-700' : status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                            {order.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-600">
                                        <span>Qty: <span className="font-semibold">{order.quantity}</span></span>
                                        <span>Total: <span className="font-semibold">{formatMoney(order.total_price || 0)}</span></span>
                                        <span>{order.payment_method || '—'}</span>
                                    </div>
                                    <div className="pt-1">
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">Delivery Status</label>
                                        <select
                                            value={order.delivery_status || 'pending'}
                                            disabled={isSaving}
                                            onChange={(e) => handleDeliveryStatusChange(order.id, e.target.value)}
                                            className={`w-full rounded border px-2 py-2 text-sm outline-none focus:border-indigo-500 ${isSaving ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="picked_up">Picked Up</option>
                                            <option value="in_transit">In Transit</option>
                                            <option value="delivered">Delivered</option>
                                        </select>
                                        {isSaving && <div className="text-xs text-indigo-500 mt-1">Saving...</div>}
                                    </div>
                                    <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
