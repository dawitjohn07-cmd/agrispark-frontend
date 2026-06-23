'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { getOrderById } from '@/lib/api';
import { formatMoney } from '@/lib/utils';

type ConfirmationOrder = {
    id: string;
    quantity: number;
    total_price: number;
    status: string;
    payment_method?: string | null;
    transaction_reference?: string | null;
    delivery_address?: string | null;
    delivery_fee?: number | null;
    platform_commission?: number | null;
    delivery_status?: string | null;
    delivery_zone?: string | null;
    created_at: string;
    products?: {
        name: string;
        price: number;
        farmer_id: string;
    } | null;
};

export default function OrderConfirmationPage() {
    const router = useRouter();
    const params = useParams();
    const orderId = String(params.id || '');

    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<ConfirmationOrder | null>(null);

    useEffect(() => {
        const loadOrder = async () => {
            setLoading(true);
            try {
                const fetchedOrder = await getOrderById(orderId);
                setOrder(fetchedOrder);
            } catch (error) {
                console.error('Failed to load confirmation order', error);
                setOrder(null);
            } finally {
                setLoading(false);
            }
        };

        if (orderId) loadOrder();
    }, [orderId]);

    const handlePrint = () => window.print();

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header role="buyer" userName="Buyer" />
                <div className="flex items-center justify-center py-24">
                    <p className="text-gray-600">Loading confirmation...</p>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-gray-50 pb-20">
                <Header role="buyer" userName="Buyer" />
                <main className="mx-auto max-w-3xl px-4 py-8">
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
                        <h1 className="text-xl font-bold">Order confirmation not found</h1>
                        <p className="mt-2 text-sm">The order details were not available in this session.</p>
                        <button
                            type="button"
                            onClick={() => router.push('/buyer')}
                            className="mt-4 rounded-xl bg-buyer-blue px-4 py-2 text-sm font-semibold text-white"
                        >
                            Back to products
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    const reference = order.transaction_reference || `ORD-${order.id.slice(0, 8).toUpperCase()}`;
    const subtotal = (order.products?.price || 0) * order.quantity;
    const deliveryFee = order.delivery_fee || 0;
    const platformFee = order.platform_commission || 0;
    const currentDeliveryStatus = order.delivery_status || order.status || 'Pending';

    let estimatedDeliveryTime = '3-5 business days';
    if (order.delivery_zone === 'same_city') {
        estimatedDeliveryTime = '1-2 business days';
    } else if (order.delivery_zone === 'out_of_city') {
        estimatedDeliveryTime = '3-5 business days';
    } else if (order.delivery_zone) {
        estimatedDeliveryTime = `3-5 business days (${order.delivery_zone})`;
    }

    return (
        <div className="min-h-screen bg-[#0b291f] pb-20 text-gray-100">
            {/* Hiding header on print with custom styling */}
            <div className="no-print">
                <Header role="buyer" userName="Buyer" />
            </div>

            <style>{`
                @media print {
                    header, .no-print, nav, .sidebar {
                        display: none !important;
                    }
                    body, .min-h-screen {
                        background: white !important;
                        color: black !important;
                    }
                    .print-container {
                        background: white !important;
                        color: black !important;
                        border: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .print-text {
                        color: black !important;
                    }
                    .print-bg {
                        background: #f3f4f6 !important;
                        border: 1px solid #e5e7eb !important;
                        color: black !important;
                    }
                }
            `}</style>

            <main className="mx-auto max-w-4xl px-6 py-8">
                <div className="print-container rounded-3xl bg-gradient-to-br from-[#052617] to-[#0b291f] p-6 shadow-xl border border-green-800">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-green-300 no-print">Success</p>
                            <div className="flex items-center gap-2 mt-1">
                                {/* Green Checkmark Icon */}
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                <h1 className="text-3xl font-extrabold text-white print-text">Order Confirmed</h1>
                            </div>
                            <p className="mt-1 text-sm text-green-200 print-text">Your order has been saved and is ready for tracking.</p>
                        </div>

                        <div className="flex items-center gap-4 no-print">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2C13.5 5 16 7 19 8C16.5 11 13 13 12 22C11 13 7.5 11 5 8C8 7 10.5 5 12 2Z" fill="#fff" />
                                    </svg>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-bold text-white">AgriSpark</div>
                                    <div className="text-xs text-green-200">Connecting Farmers & Buyers</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="print-bg rounded-2xl bg-[#072a1f] p-4">
                            <h2 className="text-xs font-semibold text-green-300 mb-3 print-text">ORDER DETAILS</h2>
                            <div className="space-y-3 text-sm text-green-50 print-text">
                                <DetailRow label="Order Reference" value={`ORD-${order.id.slice(0, 8).toUpperCase()}`} />
                                <DetailRow label="Product Name" value={order.products?.name || 'N/A'} />
                                <DetailRow label="Quantity" value={String(order.quantity)} />
                                <DetailRow label="Subtotal" value={formatMoney(subtotal)} />
                                <DetailRow label="Delivery Fee" value={formatMoney(deliveryFee)} />
                                <DetailRow label="Platform Service Fee" value={formatMoney(platformFee)} />
                                <DetailRow label="Total Price" value={formatMoney(order.total_price)} />
                                <DetailRow label="Payment Method" value={order.payment_method || 'Bank Transfer'} />
                                <DetailRow label="Transaction Reference" value={order.transaction_reference || 'N/A'} />
                                <DetailRow label="Delivery Address" value={order.delivery_address || 'Not specified'} />
                                <DetailRow label="Estimated Delivery Time" value={estimatedDeliveryTime} />
                                <DetailRow label="Current Delivery Status" value={currentDeliveryStatus} />
                                <DetailRow label="Date / Time" value={new Date(order.created_at).toLocaleString()} />
                            </div>

                            <div className="mt-6 flex flex-wrap gap-3 no-print">
                                <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 rounded-md text-white text-sm font-semibold hover:bg-blue-700 transition">Print Receipt</button>
                                <button onClick={() => router.push('/buyer')} className="px-4 py-2 bg-green-600 rounded-md text-white text-sm font-semibold hover:bg-green-700 transition">Back to Home</button>
                                <button onClick={() => router.push('/buyer/orders')} className="px-4 py-2 border border-green-700 rounded-md text-green-200 text-sm hover:bg-green-900/30 transition">View Orders</button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="print-bg rounded-lg bg-white dark:bg-[#072a1f] p-4 flex flex-col items-center shadow-sm">
                                <h3 className="text-sm text-green-700 dark:text-green-300 font-semibold print-text">TRACK YOUR ORDER</h3>
                                <div className="mt-3 bg-white p-2 rounded no-print">
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(reference)}`} alt="QR code" className="w-[150px] h-[150px] object-cover" />
                                </div>
                                <div className="mt-3 inline-flex items-center rounded-md bg-green-900/20 dark:bg-green-900/50 px-3 py-1 text-sm print-bg">
                                    <span className="text-xs text-green-800 dark:text-green-100 print-text">{reference}</span>
                                </div>
                            </div>

                            {(order.payment_method === 'Bank Transfer' || !order.payment_method) && (
                                <div className="print-bg rounded-2xl bg-[#072a1f] p-6 text-sm text-green-50 print-text">
                                    <h3 className="text-sm font-semibold text-green-300 print-text">BANK TRANSFER DETAILS</h3>
                                    <div className="mt-4 rounded-[22px] border border-[#3f6b4c] bg-[linear-gradient(180deg,rgba(84,161,96,0.22),rgba(18,41,25,0.92))] p-4 no-print">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#85c990] bg-[#173523] shadow-[inset_0_0_24px_rgba(133,201,144,0.14)]">
                                                <span className="text-xl font-black tracking-tight text-[#f1f4d6]">CBE</span>
                                            </div>
                                            <div>
                                                <p className="text-[18px] font-bold leading-tight text-white">Commercial Bank of Ethiopia</p>
                                                <p className="text-sm text-[#c9decf]">Bank Transfer Instructions</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-3 print-text">
                                        <DetailRow label="Account Holder" value="AgriSpark" />
                                        <DetailRow label="Account Number" value="1000598819298" />
                                        <DetailRow label="Bank" value="Commercial Bank of Ethiopia" />
                                        <DetailRow label="Reference Number" value={reference} />
                                    </div>

                                    <div className="mt-4 rounded-xl border border-[#3f6b4c] bg-[#102919] px-4 py-3 text-center text-xs text-[#cde2d3] no-print">
                                        Save this reference for follow-up and support.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-center bg-transparent px-2 py-2 border-b border-green-900/20 last:border-0">
            <div className="text-xs text-green-200 print-text">{label}</div>
            <div className="font-semibold text-white print-text">{value}</div>
        </div>
    );
}
