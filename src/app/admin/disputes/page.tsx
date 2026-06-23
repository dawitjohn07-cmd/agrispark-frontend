'use client';

import { useEffect, useMemo, useState, Fragment } from 'react';
import { getAdminDisputes, resolveDispute } from '@/lib/api';
import { formatMoney } from '@/lib/utils';

interface DisputeRow {
    id: string;
    order_id: string;
    buyer_id: string;
    description: string;
    evidence_url?: string | null;
    status: 'open' | 'resolved' | 'dismissed';
    resolution_note: string | null;
    refund_type?: 'full' | 'partial' | 'none' | null;
    refund_amount?: number | null;
    farmer_response?: string | null;
    farmer_evidence_url?: string | null;
    farmer_responded_at?: string | null;
    created_at: string;
    buyer_name?: string;
    product_name?: string;
    farmer_id?: string;
    farmer_name?: string;
    total_price?: number;
    quantity?: number;
    order_status?: string;
    order_created_at?: string;
}

interface UserRow { id: string; full_name: string; }
interface OrderRow { id: string; product_id: string; buyer_id: string; quantity: number; total_price: number; status: string; created_at: string; }
interface ProductRow { id: string; name: string; farmer_id: string; }

export default function AdminDisputesPage() {
    const [disputes, setDisputes] = useState<DisputeRow[]>([]);
    const [users, setUsers] = useState<UserRow[]>([]);
    const [orders, setOrders] = useState<OrderRow[]>([]);
    const [products, setProducts] = useState<ProductRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [expandedDisputeId, setExpandedDisputeId] = useState<string | null>(null);
    const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

    const [refundType, setRefundType] = useState<'full' | 'partial' | 'none'>('none');
    const [refundAmount, setRefundAmount] = useState<string>('0');

    const fetchData = async () => {
        try {
            setError('');

            const rows = await getAdminDisputes();

            const userRows = new Map<string, UserRow>();
            const orderRows = new Map<string, OrderRow>();
            const productRows = new Map<string, ProductRow>();

            (rows || []).forEach((row: any) => {
                if (row.buyer_id) {
                    userRows.set(row.buyer_id, { id: row.buyer_id, full_name: row.buyer_name || 'Unknown buyer' });
                }
                if (row.farmer_id) {
                    userRows.set(row.farmer_id, { id: row.farmer_id, full_name: row.farmer_name || 'Unknown farmer' });
                }
                if (row.order_id) {
                    orderRows.set(row.order_id, {
                        id: row.order_id,
                        product_id: row.product_id,
                        buyer_id: row.buyer_id,
                        quantity: row.quantity,
                        total_price: row.total_price,
                        status: row.order_status,
                        created_at: row.order_created_at,
                    });
                }
                if (row.product_id) {
                    productRows.set(row.product_id, {
                        id: row.product_id,
                        name: row.product_name,
                        farmer_id: row.farmer_id,
                    });
                }
            });

            const safeDisputes = (rows || []) as DisputeRow[];
            setDisputes(safeDisputes);
            setUsers(Array.from(userRows.values()));
            setOrders(Array.from(orderRows.values()));
            setProducts(Array.from(productRows.values()));

            const initialNotes: Record<string, string> = {};
            safeDisputes.forEach((dispute) => {
                initialNotes[dispute.id] = dispute.resolution_note || '';
            });
            setResolutionNotes(initialNotes);
        } catch (err: any) {
            setError(err?.message || 'Failed to load disputes.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const usersById = useMemo(() => {
        const map = new Map<string, UserRow>();
        users.forEach((user) => map.set(user.id, user));
        return map;
    }, [users]);

    const ordersById = useMemo(() => {
        const map = new Map<string, OrderRow>();
        orders.forEach((order) => map.set(order.id, order));
        return map;
    }, [orders]);

    const productsById = useMemo(() => {
        const map = new Map<string, ProductRow>();
        products.forEach((product) => map.set(product.id, product));
        return map;
    }, [products]);

    const handleRowToggle = (disputeId: string) => {
        setExpandedDisputeId((currentId) => {
            const nextId = currentId === disputeId ? null : disputeId;
            if (nextId) {
                const dispute = disputes.find(d => d.id === nextId);
                if (dispute) {
                    setRefundType(dispute.refund_type || 'none');
                    setRefundAmount(String(dispute.refund_amount || '0'));
                }
            }
            return nextId;
        });
    };

    const updateResolutionNote = (disputeId: string, value: string) => {
        setResolutionNotes((currentNotes) => ({
            ...currentNotes,
            [disputeId]: value,
        }));
    };

    const handleResolve = async (dispute: DisputeRow, action: 'approve_refund' | 'reject_dispute') => {
        setActionLoadingId(dispute.id);
        const note = (resolutionNotes[dispute.id] || '').trim();
        const amt = action === 'approve_refund' && refundType === 'partial' ? Number(refundAmount) :
                    (action === 'approve_refund' && refundType === 'full' ? Number(dispute.total_price || 0) : 0);

        try {
            await resolveDispute(dispute.id, {
                action,
                refund_type: action === 'approve_refund' ? refundType : 'none',
                refund_amount: amt,
                resolution_note: note || null,
            });

            setDisputes((currentDisputes) =>
                currentDisputes.map((currentDispute) =>
                    currentDispute.id === dispute.id
                        ? {
                            ...currentDispute,
                            status: action === 'approve_refund' ? 'resolved' : 'dismissed',
                            resolution_note: note || null,
                            refund_type: action === 'approve_refund' ? refundType : 'none',
                            refund_amount: amt,
                        }
                        : currentDispute
                )
            );
            await fetchData();
        } catch (err: any) {
            alert(err?.message || 'Failed to update dispute.');
        } finally {
            setActionLoadingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-7xl">
                <h1 className="text-3xl font-bold text-gray-900">Disputes</h1>
                <p className="mt-1 text-sm text-gray-500">Review buyer complaints and update resolution status.</p>

                {error && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Desktop table */}
                <div className="mt-4 hidden md:block overflow-x-auto overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <table className="w-full min-w-[800px]">
                        <thead className="bg-indigo-700 text-white">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Order ID</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Buyer Name</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">Loading disputes...</td>
                                </tr>
                            ) : disputes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">No disputes found.</td>
                                </tr>
                            ) : (
                                disputes.map((dispute) => {
                                    const buyer = usersById.get(dispute.buyer_id);
                                    const isLoading = actionLoadingId === dispute.id;
                                    const order = ordersById.get(dispute.order_id);
                                    const product = order ? productsById.get(order.product_id) : undefined;
                                    const farmer = product ? usersById.get(product.farmer_id) : undefined;
                                    const isExpanded = expandedDisputeId === dispute.id;

                                    return (
                                        <Fragment key={dispute.id}>
                                            <tr
                                                className="cursor-pointer border-t border-gray-100 hover:bg-gray-50"
                                                onClick={() => handleRowToggle(dispute.id)}
                                            >
                                                <td className="px-4 py-3 text-sm font-mono text-gray-800">{dispute.order_id.slice(0, 8)}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{buyer?.full_name || 'Unknown buyer'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-xs">{dispute.description}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${dispute.status === 'open' ? 'bg-yellow-100 text-yellow-700' : dispute.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                        {dispute.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{new Date(dispute.created_at).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-center" onClick={(event) => event.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRowToggle(dispute.id)}
                                                        className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
                                                    >
                                                        {isExpanded ? 'Hide' : 'Review'}
                                                    </button>
                                                </td>
                                            </tr>

                                            {isExpanded && (
                                                <tr className="border-t border-gray-100 bg-gray-50">
                                                    <td colSpan={6} className="px-4 py-4">
                                                        <div className="grid gap-4 lg:grid-cols-2">
                                                            <div className="rounded-lg border border-gray-200 bg-white p-4">
                                                                <h3 className="text-sm font-bold text-gray-900">Order Details</h3>
                                                                <div className="mt-3 space-y-2 text-sm text-gray-700">
                                                                    <p><span className="font-semibold">Product:</span> {product?.name || 'Unknown product'}</p>
                                                                    <p><span className="font-semibold">Quantity:</span> {order?.quantity ?? 'N/A'}</p>
                                                                    <p><span className="font-semibold">Total Price:</span> {order ? formatMoney(order.total_price) : 'N/A'}</p>
                                                                    <p><span className="font-semibold">Farmer Name:</span> {farmer?.full_name || 'Unknown farmer'}</p>
                                                                    <p><span className="font-semibold">Buyer Name:</span> {buyer?.full_name || 'Unknown buyer'}</p>
                                                                    <p><span className="font-semibold">Order Date:</span> {order?.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}</p>
                                                                    <p><span className="font-semibold">Order Status:</span> {order?.status || 'N/A'}</p>
                                                                </div>
                                                            </div>

                                                            <div className="rounded-lg border border-gray-200 bg-white p-4">
                                                                <h3 className="text-sm font-bold text-gray-900">Dispute & Evidence</h3>
                                                                <div className="mt-3 space-y-3 text-sm text-gray-700">
                                                                    <div>
                                                                        <span className="font-semibold">Buyer Description:</span>
                                                                        <p className="mt-1 bg-gray-50 p-2 rounded whitespace-pre-wrap">{dispute.description}</p>
                                                                    </div>
                                                                    
                                                                    {dispute.evidence_url && (
                                                                        <div>
                                                                            <span className="font-semibold">Buyer Evidence Thumbnail:</span>
                                                                            <a href={dispute.evidence_url} target="_blank" rel="noopener noreferrer" className="block mt-1">
                                                                                <img src={dispute.evidence_url} alt="Buyer Evidence" className="h-16 w-16 object-cover rounded border border-gray-300 hover:opacity-85 transition" />
                                                                            </a>
                                                                        </div>
                                                                    )}

                                                                    {dispute.farmer_response && (
                                                                        <div>
                                                                            <span className="font-semibold">Farmer Response:</span>
                                                                            <p className="mt-1 bg-gray-50 p-2 rounded whitespace-pre-wrap">{dispute.farmer_response}</p>
                                                                        </div>
                                                                    )}

                                                                    {dispute.farmer_evidence_url && (
                                                                        <div>
                                                                            <span className="font-semibold">Farmer Evidence Thumbnail:</span>
                                                                            <a href={dispute.farmer_evidence_url} target="_blank" rel="noopener noreferrer" className="block mt-1">
                                                                                <img src={dispute.farmer_evidence_url} alt="Farmer Evidence" className="h-16 w-16 object-cover rounded border border-gray-300 hover:opacity-85 transition" />
                                                                            </a>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {dispute.status === 'open' ? (
                                                                    <div className="mt-4 border-t border-gray-100 pt-4 space-y-4">
                                                                        <h4 className="text-sm font-bold text-gray-900">Resolve Dispute</h4>
                                                                        
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                            <div>
                                                                                <label className="block text-xs font-semibold text-gray-700">Refund Type</label>
                                                                                <select
                                                                                    value={refundType}
                                                                                    onChange={(e) => setRefundType(e.target.value as any)}
                                                                                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-indigo-500 bg-white"
                                                                                >
                                                                                    <option value="none">No Refund</option>
                                                                                    <option value="full">Full Refund</option>
                                                                                    <option value="partial">Partial Refund</option>
                                                                                </select>
                                                                            </div>
                                                                            
                                                                            {refundType === 'partial' && (
                                                                                <div>
                                                                                    <label className="block text-xs font-semibold text-gray-700">Refund Amount</label>
                                                                                    <input
                                                                                        type="number"
                                                                                        min="0"
                                                                                        max={dispute.total_price || undefined}
                                                                                        value={refundAmount}
                                                                                        onChange={(e) => setRefundAmount(e.target.value)}
                                                                                        className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-indigo-500 bg-white"
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <div>
                                                                            <label className="block text-xs font-semibold text-gray-700">Resolution Note</label>
                                                                            <textarea
                                                                                value={resolutionNotes[dispute.id] || ''}
                                                                                onChange={(event) => updateResolutionNote(dispute.id, event.target.value)}
                                                                                rows={3}
                                                                                className="mt-2 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 bg-white"
                                                                                placeholder="Write a note before resolving or dismissing"
                                                                            />
                                                                        </div>

                                                                        <div className="flex gap-2 justify-end">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleResolve(dispute, 'approve_refund')}
                                                                                disabled={isLoading}
                                                                                className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                                                                            >
                                                                                Approve Refund
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleResolve(dispute, 'reject_dispute')}
                                                                                disabled={isLoading}
                                                                                className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                                                                            >
                                                                                Reject Dispute
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="mt-4 border-t border-gray-100 pt-4 space-y-2 text-sm text-gray-700">
                                                                        <h4 className="font-bold text-gray-900">Resolution Details</h4>
                                                                        <p><span className="font-semibold">Resolution Note:</span> {dispute.resolution_note || 'None'}</p>
                                                                        <p><span className="font-semibold">Refund Type:</span> {dispute.refund_type || 'None'}</p>
                                                                        {dispute.refund_type !== 'none' && dispute.refund_amount !== null && (
                                                                            <p><span className="font-semibold">Refund Amount:</span> {formatMoney(Number(dispute.refund_amount))}</p>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile card stack */}
                <div className="mt-4 md:hidden space-y-3">
                    {loading ? (
                        <div className="rounded-lg border bg-white p-4 text-center text-sm text-gray-500">Loading disputes...</div>
                    ) : disputes.length === 0 ? (
                        <div className="rounded-lg border bg-white p-4 text-center text-sm text-gray-500">No disputes found.</div>
                    ) : (
                        disputes.map((dispute) => {
                            const buyer = usersById.get(dispute.buyer_id);
                            const isLoading = actionLoadingId === dispute.id;
                            const isExpanded = expandedDisputeId === dispute.id;
                            const order = ordersById.get(dispute.order_id);
                            const product = order ? productsById.get(order.product_id) : undefined;
                            const farmer = product ? usersById.get(product.farmer_id) : undefined;

                            return (
                                <div key={dispute.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
                                    <div className="flex items-start justify-between gap-2" onClick={() => handleRowToggle(dispute.id)}>
                                        <div>
                                            <p className="font-mono text-xs text-gray-600">{dispute.order_id.slice(0, 8)}</p>
                                            <p className="font-semibold text-gray-900 text-sm">{buyer?.full_name || 'Unknown buyer'}</p>
                                            <p className="text-xs text-gray-500">{new Date(dispute.created_at).toLocaleString()}</p>
                                        </div>
                                        <span className={`rounded-full px-2 py-1 text-xs font-semibold flex-shrink-0 ${dispute.status === 'open' ? 'bg-yellow-100 text-yellow-700' : dispute.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {dispute.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-700">{dispute.description}</p>
                                    <button
                                        type="button"
                                        onClick={() => handleRowToggle(dispute.id)}
                                        className="w-full rounded bg-indigo-100 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-200 min-h-[44px]"
                                    >
                                        {isExpanded ? 'Hide Details' : 'Review Dispute'}
                                    </button>

                                    {isExpanded && (
                                        <div className="pt-3 border-t border-gray-100 space-y-4">
                                            <div className="rounded-lg bg-gray-50 p-3">
                                                <h3 className="text-sm font-bold text-gray-900">Order Details</h3>
                                                <div className="mt-2 space-y-1 text-xs text-gray-700">
                                                    <p><span className="font-semibold">Product:</span> {product?.name || 'Unknown'}</p>
                                                    <p><span className="font-semibold">Quantity:</span> {order?.quantity ?? 'N/A'}</p>
                                                    <p><span className="font-semibold">Total Price:</span> {order ? formatMoney(order.total_price) : 'N/A'}</p>
                                                    <p><span className="font-semibold">Farmer:</span> {farmer?.full_name || 'Unknown'}</p>
                                                    <p><span className="font-semibold">Order Date:</span> {order?.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}</p>
                                                </div>
                                            </div>

                                            <div className="rounded-lg bg-gray-50 p-3">
                                                <h3 className="text-sm font-bold text-gray-900">Evidence</h3>
                                                {dispute.evidence_url && (
                                                    <a href={dispute.evidence_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
                                                        <img src={dispute.evidence_url} alt="Evidence" className="h-20 w-20 object-cover rounded border border-gray-300" />
                                                    </a>
                                                )}
                                                {dispute.farmer_response && (
                                                    <div className="mt-3">
                                                        <span className="text-xs font-semibold">Farmer Response:</span>
                                                        <p className="mt-1 text-xs">{dispute.farmer_response}</p>
                                                    </div>
                                                )}
                                                {dispute.farmer_evidence_url && (
                                                    <a href={dispute.farmer_evidence_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
                                                        <img src={dispute.farmer_evidence_url} alt="Evidence" className="h-20 w-20 object-cover rounded border border-gray-300" />
                                                    </a>
                                                )}
                                            </div>

                                            {dispute.status === 'open' ? (
                                                <div className="space-y-3">
                                                    <h4 className="text-sm font-bold text-gray-900">Resolve Dispute</h4>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-700">Refund Type</label>
                                                        <select
                                                            value={refundType}
                                                            onChange={(e) => setRefundType(e.target.value as any)}
                                                            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none bg-white min-h-[44px]"
                                                        >
                                                            <option value="none">No Refund</option>
                                                            <option value="full">Full Refund</option>
                                                            <option value="partial">Partial Refund</option>
                                                        </select>
                                                    </div>
                                                    {refundType === 'partial' && (
                                                        <div>
                                                            <label className="block text-xs font-semibold text-gray-700">Refund Amount</label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={dispute.total_price || undefined}
                                                                value={refundAmount}
                                                                onChange={(e) => setRefundAmount(e.target.value)}
                                                                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none bg-white min-h-[44px]"
                                                            />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-700">Resolution Note</label>
                                                        <textarea
                                                            value={resolutionNotes[dispute.id] || ''}
                                                            onChange={(e) => updateResolutionNote(dispute.id, e.target.value)}
                                                            rows={3}
                                                            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none bg-white"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleResolve(dispute, 'approve_refund')}
                                                            disabled={isLoading}
                                                            className="flex-1 rounded bg-green-600 px-3 py-2 text-xs font-semibold text-white min-h-[44px] disabled:opacity-50"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleResolve(dispute, 'reject_dispute')}
                                                            disabled={isLoading}
                                                            className="flex-1 rounded bg-red-600 px-3 py-2 text-xs font-semibold text-white min-h-[44px] disabled:opacity-50"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-1 text-xs text-gray-700">
                                                    <h4 className="font-bold text-gray-900">Resolution Details</h4>
                                                    <p><span className="font-semibold">Note:</span> {dispute.resolution_note || 'None'}</p>
                                                    <p><span className="font-semibold">Refund:</span> {dispute.refund_type || 'None'} {dispute.refund_type !== 'none' && dispute.refund_amount !== null && `(${formatMoney(Number(dispute.refund_amount))})`}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}