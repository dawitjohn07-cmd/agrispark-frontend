'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMyProfile, getOrders } from '@/lib/api';
import Header from '@/components/Header';
import { formatMoney } from '@/lib/utils';

interface Order {
    id: string;
    product_id: string;
    quantity: number;
    total_price: number;
    status: string;
    created_at: string;
    products?: { name: string; price: number };
}

export default function BuyerHistoryPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchOrders = async () => {
        try {
            const userRow = await getMyProfile();

            if (!userRow) throw new Error('User not found');
            setProfile(userRow);

            const orderRows = await getOrders();

            setOrders(((orderRows || []) as Order[]).filter((order) => order.status === 'delivered' || order.status === 'cancelled'));
        } catch (err: any) {
            setError(err?.message || 'Failed to load order history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header role="buyer" userName={profile?.full_name} />
                <div className="flex items-center justify-center py-20">
                    <p className="text-gray-600">Loading history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Header role="buyer" userName={profile?.full_name} />

            <main className="max-w-7xl mx-auto px-4 py-6">
                <h1 className="text-3xl font-bold mb-6">Order History</h1>

                {error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                        {error}
                    </div>
                )}

                {orders.length === 0 ? (
                    <div className="bg-white rounded-lg p-8 text-center">
                        <p className="text-gray-500">No order history yet</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg overflow-hidden shadow">
                        <table className="w-full">
                            <thead className="bg-buyer-blue text-white">
                                <tr>
                                    <th className="px-6 py-3 text-left">Order ID</th>
                                    <th className="px-6 py-3 text-left">Product</th>
                                    <th className="px-6 py-3 text-center">Quantity</th>
                                    <th className="px-6 py-3 text-right">Total</th>
                                    <th className="px-6 py-3 text-center">Status</th>
                                    <th className="px-6 py-3 text-left">Date</th>
                                    <th className="px-6 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => (
                                    <tr key={order.id} className="border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-mono">{order.id.slice(0, 8)}</td>
                                        <td className="px-6 py-4">{order.products?.name || 'N/A'}</td>
                                        <td className="px-6 py-4 text-center">{order.quantity}</td>
                                        <td className="px-6 py-4 text-right font-bold text-buyer-blue">{formatMoney(order.total_price)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`rounded px-2 py-1 text-xs font-semibold ${order.status === 'delivered' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">{new Date(order.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => router.push(`/chat/${order.id}`)}
                                                className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700"
                                            >
                                                Chat
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
}
