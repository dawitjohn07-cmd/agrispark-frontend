'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Header from '@/components/Header';
import { formatMoney } from '@/lib/utils';

interface OrderChatRow {
    id: string;
    total_price: number;
    quantity: number;
    status: string;
    created_at: string;
    products?: { name: string; price: number };
}

interface OrderUnreadCountRow {
    order_id: string;
    count: number;
}

export default function BuyerChat() {
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

        const loadUnreadCounts = async (buyerId: string, orderIds: string[]) => {
            if (!buyerId || orderIds.length === 0) {
                if (mounted) setUnreadCounts({});
                return;
            }

            const { data: unreadRows, error: unreadError } = await supabase
                .from('messages')
                .select('order_id')
                .eq('receiver_id', buyerId)
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
                if (!userRow?.id) throw new Error('Buyer profile not found.');

                currentUserIdRef.current = userRow.id;
                setProfile(userRow);

                const { data: orderRows, error: orderError } = await supabase
                    .from('orders')
                    .select('id, total_price, quantity, status, created_at, products(name, price)')
                    .eq('buyer_id', userRow.id)
                    .order('created_at', { ascending: false });

                if (orderError) throw orderError;

                const safeOrders = (orderRows || []) as OrderChatRow[];
                setOrders(safeOrders);
                await loadUnreadCounts(userRow.id, safeOrders.map((order) => order.id));

                removeUnreadChannel();
                unreadChannelRef.current = supabase
                    .channel(`buyer-chat-unread-${userRow.id}`)
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
        { name: 'home', href: '/buyer', icon: '🏠', label: 'Home' },
        { name: 'orders', href: '/buyer/orders', icon: '🛒', label: 'Orders' },
        { name: 'chat', href: '/buyer/chat', icon: '💬', label: 'Chat' },
        { name: 'profile', href: '/buyer/profile', icon: '👤', label: 'Profile' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Header role="buyer" userName={profile?.full_name} />

            <main className="max-w-7xl mx-auto px-4 py-6">
                <h1 className="text-3xl font-bold mb-6">Chat with Farmers</h1>

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
                        <p className="text-gray-400 text-sm">Place an order to start chatting with a farmer.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-buyer-blue text-white">
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
                                        <td className="px-6 py-4 text-right font-semibold text-buyer-blue">{formatMoney(order.total_price)}</td>
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
            </main>
        </div>
    );
}
