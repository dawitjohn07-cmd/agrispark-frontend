'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDispute, createRating, deleteOrder, getDisputes, getMyProfile, getOrders, updateOrder } from '@/lib/api';
import Header from '@/components/Header';
import { formatMoney } from '@/lib/utils';
import { uploadDisputeEvidence } from '@/lib/disputeEvidence';

interface Order {
    id: string;
    product_id: string;
    quantity: number;
    total_price: number;
    status: string;
    created_at: string;
    products?: { name: string; price: number; farmer_id: string };
}

interface Dispute {
    id: string;
    order_id: string;
    status: 'open' | 'resolved' | 'dismissed';
    description: string;
    evidence_url?: string | null;
    resolution_note: string | null;
    refund_type?: string | null;
    refund_amount?: number | null;
    created_at: string;
}

export default function BuyerOrders() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [reportingId, setReportingId] = useState<string | null>(null);
    const [selectedReportOrder, setSelectedReportOrder] = useState<Order | null>(null);
    const [reportDescription, setReportDescription] = useState('');
    const [reportFile, setReportFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [reportMessage, setReportMessage] = useState('');
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [disputesByOrder, setDisputesByOrder] = useState<Record<string, Dispute>>({});
    const [selectedResolutionDispute, setSelectedResolutionDispute] = useState<Dispute | null>(null);
    const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
    const [ratingAlreadyExists, setRatingAlreadyExists] = useState(false);
    const [ratingStars, setRatingStars] = useState(0);
    const [ratingComment, setRatingComment] = useState('');
    const [ratingSubmitting, setRatingSubmitting] = useState(false);
    const [ratingMessage, setRatingMessage] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'active' | 'history'>('active');

    const activeOrders = orders.filter((order) => order.status === 'pending' || order.status === 'confirmed');
    const historyOrders = orders.filter((order) => order.status === 'delivered' || order.status === 'cancelled');
    const displayedOrders = viewMode === 'active' ? activeOrders : historyOrders;

    const fetchDisputesForOrders = async (orderRows: Order[]) => {
        const orderIds = orderRows.map((order) => order.id);
        if (orderIds.length === 0) {
            setDisputesByOrder({});
            return;
        }

        try {
            const disputeRows = await getDisputes();
            const scopedRows = (disputeRows || []).filter((dispute: any) => orderIds.includes(dispute.order_id));

            const latestByOrder: Record<string, Dispute> = {};
            (scopedRows as Dispute[]).forEach((dispute) => {
                if (!latestByOrder[dispute.order_id]) {
                    latestByOrder[dispute.order_id] = dispute;
                }
            });

            setDisputesByOrder(latestByOrder);
        } catch (err) {
            console.error('Failed to fetch disputes', err);
        }
    };

    const fetchOrders = async () => {
        try {
            const userRow = await getMyProfile();

            if (!userRow) throw new Error('User not found');
            setProfile(userRow);

            const orderRows = await getOrders();

            const safeOrders = (orderRows || []) as Order[];
            setOrders(safeOrders);
            await fetchDisputesForOrders(safeOrders);
        } catch (err: any) {
            console.error('Error fetching orders:', err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleConfirmDelivery = async (orderId: string) => {
        const confirmed = window.confirm('Mark this order as delivered?');
        if (!confirmed) return;

        setConfirmingId(orderId);
        try {
            await updateOrder(orderId, { status: 'delivered' });

            setOrders((currentOrders) =>
                currentOrders.map((order) =>
                    order.id === orderId ? { ...order, status: 'delivered' } : order
                )
            );

            const deliveredOrder = orders.find((order) => order.id === orderId);
            if (!deliveredOrder || !profile?.id) return;

            setRatingOrder({ ...deliveredOrder, status: 'delivered' });
            setRatingComment('');
            setRatingStars(0);
            setRatingMessage('');
            setRatingAlreadyExists(false);
        } catch (err: any) {
            alert('Failed to confirm delivery: ' + (err?.message || 'Unknown error'));
        } finally {
            setConfirmingId(null);
        }
    };

    const openReportIssue = (order: Order) => {
        setSelectedReportOrder(order);
        setReportDescription('');
        setReportFile(null);
        setFilePreview(null);
        setReportMessage('');
    };

    const closeReportIssue = () => {
        if (reportSubmitting) return;
        setSelectedReportOrder(null);
        setReportDescription('');
        setReportFile(null);
        setFilePreview(null);
        setReportMessage('');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setReportFile(file);
            setFilePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmitReport = async () => {
        if (!selectedReportOrder || !profile?.id) return;

        const description = reportDescription.trim();
        if (!description) {
            setReportMessage('Please describe the issue before submitting.');
            return;
        }

        setReportSubmitting(true);
        setReportingId(selectedReportOrder.id);
        setReportMessage('');

        let evidenceUrl: string | null = null;
        try {
            if (reportFile) {
                setReportMessage('Uploading evidence image...');
                evidenceUrl = await uploadDisputeEvidence(reportFile, profile.id);
            }

            const newestDispute = await createDispute({
                order_id: selectedReportOrder.id,
                description,
                evidence_url: evidenceUrl,
            });

            if (newestDispute) {
                setDisputesByOrder((currentDisputes) => ({
                    ...currentDisputes,
                    [selectedReportOrder.id]: newestDispute as Dispute,
                }));
            }

            setReportMessage('Your report has been submitted');
            setTimeout(() => {
                setSelectedReportOrder(null);
                setReportDescription('');
                setReportFile(null);
                setFilePreview(null);
                setReportMessage('');
                fetchOrders();
            }, 1500);
        } catch (err: any) {
            setReportMessage(err?.message || 'Failed to submit report');
        } finally {
            setReportingId(null);
            setReportSubmitting(false);
        }
    };

    const handleSubmitRating = async () => {
        if (!ratingOrder || !profile?.id) return;

        if (ratingStars < 1 || ratingStars > 5) {
            setRatingMessage('Please choose a star rating before submitting.');
            return;
        }

        setRatingSubmitting(true);
        setRatingMessage('');

        try {
            const freshFarmerId = ratingOrder.products?.farmer_id;
            if (!freshFarmerId) {
                throw new Error('Could not determine the farmer for this order.');
            }

            await createRating({
                order_id: ratingOrder.id,
                farmer_id: freshFarmerId,
                stars: ratingStars,
                comment: ratingComment.trim() || null,
            });

            setRatingMessage('Thank you for your rating');
            setTimeout(() => {
                setRatingOrder(null);
                setRatingStars(0);
                setRatingComment('');
                setRatingMessage('');
            }, 1500);
        } catch (err: any) {
            setRatingMessage(err?.message || 'Failed to submit rating');
        } finally {
            setRatingSubmitting(false);
        }
    };

    const handleDeleteOrder = async (orderId: string) => {
        const confirmed = window.confirm('Are you sure you want to delete this order? This cannot be undone.');
        if (!confirmed) return;

        setDeletingId(orderId);
        try {
            await deleteOrder(orderId);
            await fetchOrders();
        } catch (err: any) {
            alert('Error: ' + (err.message || 'Failed to delete order'));
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header role="buyer" userName={profile?.full_name} />
                <div className="flex items-center justify-center py-20">
                    <p className="text-gray-600">Loading orders...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Header role="buyer" userName={profile?.full_name} />

            <main className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold">My Orders</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode('active')}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${viewMode === 'active' ? 'bg-buyer-blue text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            Active Orders
                        </button>
                        <button
                            onClick={() => setViewMode('history')}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${viewMode === 'history' ? 'bg-buyer-blue text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            History
                        </button>
                    </div>
                </div>

                {displayedOrders.length === 0 ? (
                    <div className="bg-white rounded-lg p-8 text-center">
                        <p className="text-gray-500">No {viewMode} orders found</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {displayedOrders.map((order) => {
                            const dispute = disputesByOrder[order.id];
                            const canViewResolution = dispute && (dispute.status === 'resolved' || dispute.status === 'dismissed');
                            const expanded = expandedId === order.id;

                            const badgeClass = order.status === 'confirmed' ? 'bg-green-100 text-green-800 badge-confirmed' :
                                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    order.status === 'delivered' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800';

                            return (
                                <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expanded ? null : order.id)}>
                                        <div>
                                            <div className="text-lg font-semibold text-gray-900">{order.products?.name || 'N/A'}</div>
                                            <div className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="font-bold text-gray-900">{formatMoney(order.total_price)}</div>
                                            </div>
                                            <div className="flex flex-col gap-1 items-end">
                                                <span className={`px-3 py-1 rounded text-sm font-semibold ${badgeClass}`}>{order.status}</span>
                                                {dispute && order.status !== 'delivered' && (
                                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                                        dispute.status === 'open' ? 'bg-orange-100 text-orange-800' :
                                                        dispute.status === 'resolved' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                        Dispute: {dispute.status}
                                                    </span>
                                                )}
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); setExpandedId(expanded ? null : order.id); }} className="ml-2 text-sm text-green-600 hover:text-green-800">{expanded ? 'Hide' : 'View Details'}</button>
                                        </div>
                                    </div>

                                    {expanded && (
                                        <div className="border-t border-gray-100 p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                                <div><span className="text-xs text-gray-500">Order ID</span><div className="font-mono text-sm">{order.id}</div></div>
                                                <div><span className="text-xs text-gray-500">Quantity</span><div className="text-sm">{order.quantity}</div></div>
                                                <div><span className="text-xs text-gray-500">Date</span><div className="text-sm">{new Date(order.created_at).toLocaleDateString()}</div></div>
                                                <div><span className="text-xs text-gray-500">Delivery Status</span><div className="text-sm capitalize font-semibold">{order.delivery_status || 'pending'}</div></div>
                                            </div>

                                            <div className="mb-4 text-sm text-gray-700">Product: <span className="font-medium text-gray-900">{order.products?.name || 'N/A'}</span></div>

                                            <div className="flex flex-wrap gap-2">
                                                <button onClick={() => router.push(`/chat/${order.id}`)} className="px-3 py-1 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700">Chat</button>

                                                {order.status === 'pending' && (
                                                    <button onClick={() => handleDeleteOrder(order.id)} disabled={deletingId === order.id} className="px-3 py-1 bg-red-600 text-white text-sm font-bold rounded hover:bg-red-700 disabled:opacity-50">
                                                        {deletingId === order.id ? 'Cancelling...' : 'Cancel'}
                                                    </button>
                                                )}

                                                {order.status === 'confirmed' && (
                                                    <>
                                                        <button onClick={() => handleConfirmDelivery(order.id)} disabled={confirmingId === order.id} className="px-3 py-1 bg-green-600 text-white text-sm font-bold rounded hover:bg-green-700 disabled:opacity-50">
                                                            {confirmingId === order.id ? 'Updating...' : 'Confirm Delivery'}
                                                        </button>
                                                        {!dispute && (
                                                            <button onClick={() => openReportIssue(order)} disabled={reportingId === order.id} className="px-3 py-1 bg-red-600 text-white text-sm font-bold rounded hover:bg-red-700 disabled:opacity-50">
                                                                Report Issue
                                                            </button>
                                                        )}
                                                    </>
                                                )}

                                                {order.status === 'delivered' && (
                                                    <>
                                                        {!dispute && (
                                                            <button onClick={() => openReportIssue(order)} disabled={reportingId === order.id} className="px-3 py-1 bg-red-600 text-white text-sm font-bold rounded hover:bg-red-700 disabled:opacity-50">Report Issue</button>
                                                        )}
                                                    </>
                                                )}

                                                {order.status === 'cancelled' && (
                                                    <button onClick={() => handleDeleteOrder(order.id)} disabled={deletingId === order.id} className="px-3 py-1 bg-red-600 text-white text-sm font-bold rounded hover:bg-red-700 disabled:opacity-50">{deletingId === order.id ? 'Deleting...' : 'Delete'}</button>
                                                )}

                                                {canViewResolution && (
                                                    <button onClick={() => setSelectedResolutionDispute(dispute)} className="px-3 py-1 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700">View Resolution</button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {selectedReportOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                        <h2 className="text-2xl font-bold text-gray-900">Report Issue</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Order {selectedReportOrder.id.slice(0, 8)}
                        </p>

                        <label className="mt-4 block text-sm font-medium text-gray-700">Describe the problem</label>
                        <textarea
                            value={reportDescription}
                            onChange={(event) => setReportDescription(event.target.value)}
                            rows={5}
                            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-buyer-blue"
                            placeholder="Explain what went wrong with the order"
                        />

                        <label className="mt-4 block text-sm font-medium text-gray-700">Upload Evidence (Optional)</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {filePreview && (
                            <div className="mt-3">
                                <img src={filePreview} alt="Evidence Preview" className="max-h-32 rounded object-contain border border-gray-200" />
                            </div>
                        )}

                        {reportMessage && (
                            <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${reportMessage === 'Your report has been submitted' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {reportMessage}
                            </div>
                        )}

                        <div className="mt-5 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={closeReportIssue}
                                disabled={reportSubmitting}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmitReport}
                                disabled={reportSubmitting || !reportDescription.trim()}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedResolutionDispute && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                        <h2 className="text-2xl font-bold text-gray-900">Dispute Resolution</h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Status: <span className="font-semibold">{selectedResolutionDispute.status}</span>
                        </p>

                        <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700 space-y-2">
                            <p className="font-semibold text-gray-900">Resolution Note</p>
                            <p className="whitespace-pre-wrap">{selectedResolutionDispute.resolution_note || 'No note was provided by admin.'}</p>
                            
                            {selectedResolutionDispute.refund_type && (
                                <p className="mt-2"><span className="font-semibold">Refund Type:</span> {
                                    selectedResolutionDispute.refund_type === 'full' ? 'Full Refund' :
                                    selectedResolutionDispute.refund_type === 'partial' ? 'Partial Refund' : 'No Refund'
                                }</p>
                            )}

                            {selectedResolutionDispute.refund_type !== 'none' && selectedResolutionDispute.refund_amount !== null && selectedResolutionDispute.refund_amount !== undefined && (
                                <p><span className="font-semibold">Refund Amount:</span> {formatMoney(Number(selectedResolutionDispute.refund_amount))}</p>
                            )}
                        </div>

                        <div className="mt-5 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedResolutionDispute(null)}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {ratingOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                        <h2 className="text-2xl font-bold text-gray-900">Rate Your Delivery</h2>
                        <p className="mt-1 text-sm text-gray-500">Order {ratingOrder.id.slice(0, 8)}</p>

                        {ratingAlreadyExists ? (
                            <div className="mt-4 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
                                You already rated this order
                            </div>
                        ) : (
                            <>
                                <div className="mt-4 flex items-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRatingStars(star)}
                                            className="text-3xl leading-none"
                                        >
                                            {star <= ratingStars ? '★' : '☆'}
                                        </button>
                                    ))}
                                </div>

                                <label className="mt-4 block text-sm font-medium text-gray-700">Comment (optional)</label>
                                <textarea
                                    value={ratingComment}
                                    onChange={(event) => setRatingComment(event.target.value)}
                                    rows={4}
                                    className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-buyer-blue"
                                    placeholder="Share your experience"
                                />
                            </>
                        )}

                        {ratingMessage && (
                            <div className={`mt-4 rounded-lg px-3 py-2 text-sm ${ratingMessage === 'Thank you for your rating' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {ratingMessage}
                            </div>
                        )}

                        <div className="mt-5 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setRatingOrder(null)}
                                disabled={ratingSubmitting}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                Close
                            </button>
                            {!ratingAlreadyExists && (
                                <button
                                    type="button"
                                    onClick={handleSubmitRating}
                                    disabled={ratingSubmitting}
                                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                    {ratingSubmitting ? 'Submitting...' : 'Submit Rating'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}