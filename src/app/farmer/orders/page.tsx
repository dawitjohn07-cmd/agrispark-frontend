'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDisputes, getMyProfile, getOrders, updateOrder, respondToDispute } from '@/lib/api';
import Header from '@/components/Header';
import { formatMoney } from '@/lib/utils';
import { uploadDisputeEvidence } from '@/lib/disputeEvidence';

interface Order {
    id: string;
    product_id: string;
    buyer_id: string;
    quantity: number;
    total_price: number;
    status: string;
    created_at: string;
    products?: { name: string; price: number };
}

interface DisputeRow {
    id: string;
    order_id: string;
    status: string;
    description: string;
    evidence_url?: string | null;
    farmer_response?: string | null;
}

export default function FarmerOrders() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [openDisputeOrderIds, setOpenDisputeOrderIds] = useState<Set<string>>(new Set());
    const [disputesByOrderId, setDisputesByOrderId] = useState<Record<string, DisputeRow>>({});

    const [selectedDispute, setSelectedDispute] = useState<DisputeRow | null>(null);
    const [farmerResponseText, setFarmerResponseText] = useState('');
    const [farmerFile, setFarmerFile] = useState<File | null>(null);
    const [farmerFilePreview, setFarmerFilePreview] = useState<string | null>(null);
    const [submittingResponse, setSubmittingResponse] = useState(false);
    const [submitMessage, setSubmitMessage] = useState('');

    const activeOrders = orders.filter((order) => order.status === 'pending' || order.status === 'confirmed' || order.status === 'delivered' || order.status === 'cancelled');

    const fetchOrders = async () => {
        try {
            const userRow = await getMyProfile();

            if (!userRow) throw new Error('User not found');
            setProfile(userRow);

            const safeOrders = ((await getOrders()) || []) as Order[];
            setOrders(safeOrders);

            const orderIds = safeOrders.map((order) => order.id);
            if (orderIds.length > 0) {
                const disputeRows = await getDisputes();
                const openOrderIds = new Set<string>();
                const disputesMap: Record<string, DisputeRow> = {};

                ((disputeRows || []) as DisputeRow[]).forEach((dispute) => {
                    const disputeOrderId = (dispute.order_id || '').trim().toLowerCase();
                    if (disputeOrderId) {
                        disputesMap[dispute.order_id] = dispute;
                        if ((dispute.status || '').trim().toLowerCase() === 'open') {
                            openOrderIds.add(disputeOrderId);
                        }
                    }
                });

                setOpenDisputeOrderIds(openOrderIds);
                setDisputesByOrderId(disputesMap);
            } else {
                setOpenDisputeOrderIds(new Set());
                setDisputesByOrderId({});
            }
        } catch (err: any) {
            console.error('Error fetching orders:', err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleOrderAction = async (orderId: string, newStatus: string) => {
        setUpdatingId(orderId);

        try {
            await updateOrder(orderId, { status: newStatus });
            await fetchOrders();
        } catch (err: any) {
            console.error('Error updating order:', err.message);
            alert('Error: ' + (err.message || 'Failed to update order'));
        } finally {
            setUpdatingId(null);
        }
    };

    const handleFarmerDelete = async (orderId: string) => {
        setUpdatingId(orderId);
        try {
            await updateOrder(orderId, { status: 'cancelled' });
            await fetchOrders();
        } catch (err: any) {
            alert('Error: ' + (err.message || 'Failed to hide order'));
        } finally {
            setUpdatingId(null);
        }
    };

    const handleFarmerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFarmerFile(file);
            setFarmerFilePreview(URL.createObjectURL(file));
        }
    };

    const handleRespondSubmit = async () => {
        if (!selectedDispute || !profile?.id) return;

        const responseText = farmerResponseText.trim();
        if (!responseText) {
            setSubmitMessage('Please enter a response.');
            return;
        }

        setSubmittingResponse(true);
        setSubmitMessage('');

        let evidenceUrl: string | null = null;
        try {
            if (farmerFile) {
                setSubmitMessage('Uploading evidence image...');
                evidenceUrl = await uploadDisputeEvidence(farmerFile, profile.id);
            }

            await respondToDispute(selectedDispute.id, {
                farmer_response: responseText,
                farmer_evidence_url: evidenceUrl,
            });

            setSubmitMessage('Response submitted successfully!');
            setTimeout(() => {
                setSelectedDispute(null);
                setFarmerResponseText('');
                setFarmerFile(null);
                setFarmerFilePreview(null);
                setSubmitMessage('');
                fetchOrders();
            }, 1500);
        } catch (err: any) {
            setSubmitMessage(err?.message || 'Failed to submit response.');
        } finally {
            setSubmittingResponse(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header role="farmer" userName={profile?.full_name} />
                <div className="flex items-center justify-center py-20">
                    <p className="text-gray-600">Loading orders...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Header role="farmer" userName={profile?.full_name} />

            <main className="max-w-7xl mx-auto px-4 py-6">
                <h1 className="text-3xl font-bold mb-6">Orders</h1>

                {activeOrders.length === 0 ? (
                    <div className="bg-white rounded-lg p-8 text-center">
                        <p className="text-gray-500">No orders yet</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg overflow-hidden shadow">
                        <table className="w-full">
                            <thead className="bg-farmer-green text-white">
                                <tr>
                                    <th className="px-6 py-3 text-left">Order ID</th>
                                    <th className="px-6 py-3 text-left">Product</th>
                                    <th className="px-6 py-3 text-center">Quantity</th>
                                    <th className="px-6 py-3 text-right">Total</th>
                                    <th className="px-6 py-3 text-center">Status</th>
                                    <th className="px-6 py-3 text-center">Delivery Status</th>
                                    <th className="px-6 py-3 text-left">Date</th>
                                    <th className="px-6 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeOrders.map((order) => {
                                    const dispute = disputesByOrderId[order.id];
                                    const hasOpenDispute = openDisputeOrderIds.has(order.id.trim().toLowerCase());

                                    return (
                                        <tr key={order.id} className="border-b hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm font-mono">{order.id.slice(0, 8)}</td>
                                            <td className="px-6 py-4">{order.products?.name || 'N/A'}</td>
                                            <td className="px-6 py-4 text-center">{order.quantity}</td>
                                            <td className="px-6 py-4 text-right font-bold text-farmer-green">
                                                {formatMoney(order.total_price)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center justify-center gap-1">
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${order.status === 'confirmed' ? 'bg-green-100 text-green-800 badge-confirmed' :
                                                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            order.status === 'delivered' ? 'bg-blue-100 text-blue-800' :
                                                                'bg-red-100 text-red-800'
                                                        }`}>
                                                        {order.status}
                                                    </span>
                                                    {hasOpenDispute && (
                                                        <span className="rounded bg-red-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                                                            Dispute Open
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm font-semibold text-gray-700 capitalize">
                                                {order.delivery_status || 'pending'}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {new Date(order.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex gap-2 justify-center items-center">
                                                    <button
                                                        onClick={() => router.push(`/chat/${order.id}`)}
                                                        className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700"
                                                    >
                                                        Chat
                                                    </button>

                                                    {order.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleOrderAction(order.id, 'confirmed')}
                                                                disabled={updatingId === order.id}
                                                                className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 disabled:opacity-50"
                                                            >
                                                                Accept
                                                            </button>
                                                            <button
                                                                onClick={() => handleOrderAction(order.id, 'cancelled')}
                                                                disabled={updatingId === order.id}
                                                                className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 disabled:opacity-50"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}

                                                    {order.status === 'cancelled' && (
                                                        <button
                                                            onClick={() => handleFarmerDelete(order.id)}
                                                            disabled={updatingId === order.id}
                                                            className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 disabled:opacity-50"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}

                                                    {dispute && (
                                                        <div className="ml-1">
                                                            {dispute.farmer_response ? (
                                                                <span className="inline-block rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                                                                    Response Submitted
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedDispute(dispute);
                                                                        setFarmerResponseText('');
                                                                        setFarmerFile(null);
                                                                        setFarmerFilePreview(null);
                                                                        setSubmitMessage('');
                                                                    }}
                                                                    className="px-3 py-1 bg-yellow-600 text-white text-xs font-bold rounded hover:bg-yellow-700"
                                                                >
                                                                    Respond to Dispute
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {selectedDispute && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <h2 className="text-2xl font-bold text-gray-900">Respond to Dispute</h2>

                        <div className="mt-4 border-b border-gray-100 pb-4">
                            <h3 className="text-sm font-semibold text-gray-700">Buyer Complaint</h3>
                            <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{selectedDispute.description}</p>
                            {selectedDispute.evidence_url && (
                                <div className="mt-3">
                                    <p className="text-xs font-semibold text-gray-500 mb-1">Buyer Evidence</p>
                                    <a href={selectedDispute.evidence_url} target="_blank" rel="noopener noreferrer">
                                        <img
                                            src={selectedDispute.evidence_url}
                                            alt="Buyer Evidence"
                                            className="max-h-48 rounded object-contain border border-gray-200 hover:opacity-90 transition"
                                        />
                                    </a>
                                </div>
                            )}
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700">Your Response</label>
                            <textarea
                                value={farmerResponseText}
                                onChange={(e) => setFarmerResponseText(e.target.value)}
                                rows={4}
                                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-farmer-green"
                                placeholder="Explain your side of the issue"
                            />
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700">Upload Evidence (Optional)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFarmerFileChange}
                                className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                            />
                            {farmerFilePreview && (
                                <div className="mt-2">
                                    <img src={farmerFilePreview} alt="Preview" className="max-h-32 rounded object-contain border border-gray-200" />
                                </div>
                            )}
                        </div>

                        {submitMessage && (
                            <div className={`mt-4 rounded-lg px-3 py-2 text-sm ${submitMessage.includes('successfully') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {submitMessage}
                            </div>
                        )}

                        <div className="mt-5 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedDispute(null);
                                    setFarmerResponseText('');
                                    setFarmerFile(null);
                                    setFarmerFilePreview(null);
                                    setSubmitMessage('');
                                }}
                                disabled={submittingResponse}
                                className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleRespondSubmit}
                                disabled={submittingResponse || !farmerResponseText.trim()}
                                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
                            >
                                {submittingResponse ? 'Submitting...' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}