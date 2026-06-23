'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Header from '@/components/Header';
import { formatMoney } from '@/lib/utils';

interface OrderChatRow {
    id: string;
    product_id: string;
    quantity: number;
    total_price: number;
    status: string;
    created_at: string;
    products?: { name: string; price: number };
}

interface OrderUnreadCountRow {
    order_id: string;
    count: number;
}

export default function FarmerChat() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [orders, setOrders] = useState<OrderChatRow[]>([]);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const currentUserIdRef = useRef<string | null>(null);
    const unreadChannelRef = useRef<any>(null);

    useEffect(() => {
        let mounted = true;

        const removeUnreadChannel = () => {
            if (unreadChannelRef.current) {
                supabase.removeChannel(unreadChannelRef.current);
                unreadChannelRef.current = null;
            }
        };

        const loadUnreadCounts = async (farmerId: string, orderIds: string[]) => {
            if (!farmerId || orderIds.length === 0) {
                if (mounted) setUnreadCounts({});
                return;
            }

            const { data: unreadRows, error: unreadError } = await supabase
                .from('messages')
                .select('order_id')
                .eq('receiver_id', farmerId)
                .eq('is_read', false)
                .in('order_id', orderIds);

            if (unreadError) throw unreadError;

            const counts = ((unreadRows || []) as OrderUnreadCountRow[]).reduce<Record<string, number>>((accumulator, row) => {
                accumulator[row.order_id] = (accumulator[row.order_id] || 0) + 1;
                return accumulator;
            }, {});

            if (mounted) setUnreadCounts(counts);
        };

        const fetchChatOrders = async () => {
            try {
                const { data: authData } = await supabase.auth.getUser();
                const authUser = authData?.user;

                if (!authUser?.email) throw new Error('Please sign in to access chat.');

                const { data: userRow, error: userError } = await supabase
                    .from('users')
                    .select('id, full_name')
                    .eq('email', authUser.email.toLowerCase())
                    .maybeSingle();

                if (userError) throw userError;
                if (!userRow?.id) throw new Error('Farmer profile not found.');

                currentUserIdRef.current = userRow.id;
                setProfile(userRow);

                const { data: products } = await supabase
                    .from('products')
                    .select('id')
                    .eq('farmer_id', userRow.id)
                    .eq('is_deleted', false);

                const productIds = (products || []).map((product) => product.id);
                if (!productIds.length) {
                    setOrders([]);
                    return;
                }

                const { data: orderRows, error: orderError } = await supabase
                    .from('orders')
                    .select('id, product_id, quantity, total_price, status, created_at, products(name, price)')
                    .in('product_id', productIds)
                    .order('created_at', { ascending: false });

                if (orderError) throw orderError;

                const safeOrders = (orderRows || []) as OrderChatRow[];
                setOrders(safeOrders);
                await loadUnreadCounts(userRow.id, safeOrders.map((order) => order.id));

                removeUnreadChannel();
                unreadChannelRef.current = supabase
                    .channel(`farmer-chat-unread-${userRow.id}`)
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'messages',
                            filter: `receiver_id=eq.${userRow.id}`,
                        },
                        async () => {
                            await loadUnreadCounts(userRow.id, safeOrders.map((order) => order.id));
                        }
                    )
                    .subscribe();
            } catch (err: any) {
                setError(err?.message || 'Could not load chats.');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchChatOrders();

        return () => {
            mounted = false;
            currentUserIdRef.current = null;
            if (unreadChannelRef.current) {
                supabase.removeChannel(unreadChannelRef.current);
                unreadChannelRef.current = null;
            }
        };
    }, []);

    const tabsConfig = [
        { name: 'home', href: '/farmer', icon: '🏠', label: 'Home' },
        { name: 'products', href: '/farmer/products', icon: '🧺', label: 'Products' },
        { name: 'create', href: '/farmer/create', icon: '➕', label: 'Create' },
        { name: 'orders', href: '/farmer/orders', icon: '🛒', label: 'Orders' },
        { name: 'chat', href: '/farmer/chat', icon: '💬', label: 'Chat' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Header role="farmer" userName={profile?.full_name} />

            <main className="max-w-7xl mx-auto px-4 py-6">
                <h1 className="text-3xl font-bold mb-6">Chat</h1>

                {error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="bg-white rounded-lg p-8 text-center shadow">
                        <p className="text-gray-600">Loading chats...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="bg-white rounded-lg p-8 text-center shadow">
                        <p className="text-gray-500 mb-2">No chats yet.</p>
                        <p className="text-gray-400 text-sm">Chats appear after buyers place orders for your products.</p>
                    </div>
                ) : (
                    <div className="hidden md:block bg-white rounded-lg shadow overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-farmer-green text-white">
                                <tr>
                                    <th className="px-6 py-3 text-left">Order</th>
                                    <th className="px-6 py-3 text-left">Product</th>
                                    <th className="px-6 py-3 text-right">Total</th>
                                    <th className="px-6 py-3 text-center">Status</th>
                                    <th className="px-6 py-3 text-left">Date</th>
                                    <th className="px-6 py-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => (
                                    <tr key={order.id} className="border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-mono">{order.id.slice(0, 8)}</td>
                                        <td className="px-6 py-4">{order.products?.name || 'Product'}</td>
                                        <td className="px-6 py-4 text-right font-semibold text-farmer-green">{formatMoney(order.total_price)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${order.status === 'completed' ? 'bg-green-100 text-green-800' : order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">{new Date(order.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-2">
                                                <button
                                                    onClick={() => router.push(`/chat/${order.id}`)}
                                                    className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700"
                                                >
                                                    Open Chat
                                                </button>
                                                {unreadCounts[order.id] > 0 && (
                                                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
                                                        {unreadCounts[order.id]}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Mobile card stack */}
                {orders.length > 0 && !loading && (
                    <div className="mt-4 md:hidden space-y-3">
                        {orders.map((order) => (
                            <div key={order.id} className="rounded-lg bg-white p-4 shadow-sm space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-mono text-xs text-gray-500">{order.id.slice(0, 8)}</p>
                                        <p className="font-semibold text-gray-900">{order.products?.name || 'Product'}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-semibold flex-shrink-0 ${order.status === 'completed' ? 'bg-green-100 text-green-800' : order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                        {order.status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-semibold text-farmer-green">{formatMoney(order.total_price)}</span>
                                    <span className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center justify-end pt-2">
                                    <div className="inline-flex items-center gap-2">
                                        <button
                                            onClick={() => router.push(`/chat/${order.id}`)}
                                            className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 min-h-[44px]"
                                        >
                                            Open Chat
                                        </button>
                                        {unreadCounts[order.id] > 0 && (
                                            <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-600 px-2 text-xs font-bold text-white">
                                                {unreadCounts[order.id]}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
