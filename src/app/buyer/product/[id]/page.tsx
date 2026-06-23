'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createOrder, getMyProfile, getProductById, verifyPaypalPayment, verifyCbePayment } from '@/lib/api';
import Header from '@/components/Header';
import { formatMoney, resolveImageUrl } from '@/lib/utils';

interface Product {
    id: string;
    name: string;
    category: string;
    quantity: number;
    price: number;
    location: string;
    description: string;
    image_url: string;
    resolved_image_url: string;
    farmer_id: string;
    created_at: string;
    pricing_type?: string;
}

export default function ProductDetail() {
    const router = useRouter();
    const params = useParams();
    const productId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState<Product | null>(null);
    const [buyerProfile, setBuyerProfile] = useState<any>(null);
    const [orderQuantity, setOrderQuantity] = useState('1');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    const [paymentMessage, setPaymentMessage] = useState('');
    const [pendingOrder, setPendingOrder] = useState<null | { quantity: number; totalPrice: number }>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [selectedMethod, setSelectedMethod] = useState<'paypal' | 'cbe' | null>(null);
    const [cbeReference, setCbeReference] = useState('');
    const [paypalLoading, setPaypalLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError('');

            try {
                console.log('ProductDetail: productId=', productId);

                // Fetch product (public)
                const productData = await getProductById(productId);

                console.log('ProductDetail: productData', productData);

                if (!productData) {
                    setError('Product not found');
                    setLoading(false);
                    return;
                }

                const farmerLocation = productData.farmer_location || '';

                const productLocation = productData.location?.trim();
                const normalizedProductLocation =
                    productLocation && productLocation.toLowerCase() !== 'not specified' ? productLocation : '';

                const resolvedProduct = {
                    ...productData,
                    location: normalizedProductLocation || farmerLocation || '',
                    resolved_image_url: resolveImageUrl(productData.image_url),
                };

                setProduct(resolvedProduct as Product);
                console.log('Product farmer_id:', resolvedProduct.farmer_id);

                // Try to load authenticated buyer profile (optional)
                try {
                    const buyerData = await getMyProfile();
                    if (buyerData && buyerData.role === 'buyer') {
                        setBuyerProfile(buyerData);
                    }
                } catch (e) {
                    console.log('ProductDetail: auth check failed', e);
                }
            } catch (err: any) {
                console.error('ProductDetail: fetch error', err);
                setError(err?.message || 'Error loading product');
            } finally {
                setLoading(false);
            }
        };

        if (productId) fetchData();
    }, [productId]);

    const handlePlaceOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!product) {
            setError('Product not loaded');
            return;
        }

        if (!buyerProfile) {
            // prompt login for placing orders
            router.push('/login');
            return;
        }

        const qty = parseInt(orderQuantity);
        if (isNaN(qty) || qty <= 0) {
            setError('Please enter a valid quantity');
            return;
        }

        if (qty > product.quantity) {
            setError(`Only ${product.quantity} units available`);
            return;
        }

        setPendingOrder({ quantity: qty, totalPrice: qty * product.price });
        setPaymentMessage('');
        setPaymentModalOpen(true);
    };

    useEffect(() => {
        if (!paymentModalOpen || selectedMethod !== 'paypal' || !pendingOrder || !product) {
            return;
        }

        const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
        if (!clientId) {
            console.error('NEXT_PUBLIC_PAYPAL_CLIENT_ID is not configured in web-app env variables');
            return;
        }

        setPaypalLoading(true);

        const scriptId = 'paypal-sdk-script';
        let script = document.getElementById(scriptId) as HTMLScriptElement;

        const initPaypalButtons = () => {
            setPaypalLoading(false);
            if ((window as any).paypal) {
                // Clear any existing buttons inside container before rendering
                const container = document.getElementById('paypal-button-container');
                if (container) {
                    container.innerHTML = '';
                }

                (window as any).paypal.Buttons({
                    createOrder: function (data: any, actions: any) {
                        return actions.order.create({
                            purchase_units: [{
                                amount: {
                                    value: (pendingOrder.totalPrice).toFixed(2),
                                    currency_code: 'USD',
                                },
                            }],
                        });
                    },
                    onApprove: async function (data: any, actions: any) {
                        setPaymentProcessing(true);
                        setPaymentMessage('Verifying PayPal Payment...');
                        try {
                            const res = await verifyPaypalPayment({
                                paypal_order_id: data.orderID,
                                product_id: product.id,
                                quantity: pendingOrder.quantity,
                            });
                            setPaymentMessage('Payment Successful! Redirecting to confirmation page...');
                            setTimeout(() => {
                                setPaymentModalOpen(false);
                                router.push(`/buyer/order-confirmation/${res.order?.id || res.order?.order?.id || res.id}`);
                            }, 1500);
                        } catch (err: any) {
                            console.error('PayPal verification error:', err);
                            setPaymentMessage(`Verification Failed: ${err.message || 'Please contact support.'}`);
                            setPaymentProcessing(false);
                        }
                    },
                    onError: function (err: any) {
                        console.error('PayPal button error:', err);
                        setPaymentMessage('An error occurred during PayPal transaction.');
                    }
                }).render('#paypal-button-container');
            }
        };

        if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
            script.async = true;
            script.onload = () => {
                initPaypalButtons();
            };
            script.onerror = () => {
                setPaymentMessage('Failed to load PayPal SDK.');
                setPaypalLoading(false);
            };
            document.body.appendChild(script);
        } else {
            if ((window as any).paypal) {
                initPaypalButtons();
            } else {
                script.addEventListener('load', initPaypalButtons);
            }
        }

        return () => {
            if (script) {
                script.removeEventListener('load', initPaypalButtons);
            }
        };
    }, [paymentModalOpen, selectedMethod, pendingOrder, product, router]);

    const handleCbePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product || !buyerProfile || !pendingOrder || !cbeReference.trim()) return;

        setPaymentProcessing(true);
        setPaymentMessage('Verifying CBE Bank Transfer...');

        try {
            const res = await verifyCbePayment({
                product_id: product.id,
                quantity: pendingOrder.quantity,
                transaction_reference: cbeReference.trim(),
            });

            setPaymentMessage('Bank transfer registered successfully! Redirecting...');
            setTimeout(() => {
                setPaymentModalOpen(false);
                router.push(`/buyer/order-confirmation/${res.id || res.order?.id}`);
            }, 1500);
        } catch (err: any) {
            console.error('CBE verification error', err);
            setPaymentMessage(err?.message || 'Failed to verify CBE Bank Transfer. Please check your transaction reference.');
            setPaymentProcessing(false);
        }
    };

    const closePaymentModal = () => {
        if (paymentProcessing) return;
        setPaymentModalOpen(false);
        setPendingOrder(null);
        setSelectedMethod(null);
        setCbeReference('');
        setPaymentMessage('');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header role="buyer" userName={buyerProfile?.full_name} />
                <div className="flex items-center justify-center py-20">
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header role="buyer" userName={buyerProfile?.full_name} />
                <main className="max-w-4xl mx-auto px-4 py-6">
                    <div className="text-center py-12">
                        <p className="text-red-600 text-lg">{error || 'Product not found'}</p>
                        <button
                            onClick={() => router.push('/buyer')}
                            className="mt-4 px-6 py-2 bg-buyer-blue text-white rounded-lg hover:bg-opacity-90"
                        >
                            Back to Products
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Header role="buyer" userName={buyerProfile?.full_name} />

            <main className="max-w-4xl mx-auto px-4 py-6">
                <button onClick={() => router.push('/buyer')} className="mb-6 text-buyer-blue hover:underline">
                    ← Back to Products
                </button>

                <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                    <div className="grid md:grid-cols-2 gap-8 p-8">
                        <div>
                            {product.resolved_image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={product.resolved_image_url} alt={product.name} className="w-full h-96 object-cover rounded-lg" />
                            ) : (
                                <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                                    <p className="text-gray-400">No image available</p>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col justify-between">
                            <div>
                                <div className="mb-4">
                                    <span className="inline-block px-3 py-1 bg-buyer-blue text-white rounded-full text-sm font-semibold">{product.category}</span>
                                </div>

                                <h1 className="text-4xl font-bold mb-4">{product.name}</h1>

                                <p className="text-gray-600 mb-6">{product.description}</p>

                                <div className="space-y-3 mb-8">
                                    <div className="flex justify-between items-center py-3 border-b">
                                        <span className="text-gray-600">{product.pricing_type === 'per_kg' ? 'Price per KG:' : 'Price per unit:'}</span>
                                        <span className="text-2xl font-bold text-farmer-green">{
                                            product.pricing_type === 'per_kg'
                                                ? `${formatMoney(product.price)}/kg`
                                                : `${formatMoney(product.price)} per item`
                                        }</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b">
                                        <span className="text-gray-600">Available quantity:</span>
                                        <span className="text-xl font-semibold">{product.quantity} units</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b">
                                        <span className="text-gray-600">Location:</span>
                                        <span className="font-semibold">{product.location}</span>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handlePlaceOrder} className="space-y-4">
                                {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
                                {success && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity (units)</label>
                                    <input type="number" min="1" max={product.quantity} value={orderQuantity} onChange={(e) => setOrderQuantity(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-buyer-blue focus:border-transparent" />
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-gray-600">Total Price:</span>
                                        <span className="text-2xl font-bold text-farmer-green">{formatMoney(parseInt(orderQuantity || '0') * product.price)}</span>
                                    </div>
                                </div>

                                <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-buyer-blue text-white font-bold rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-all">{isSubmitting ? 'Placing Order...' : 'Place Order'}</button>
                            </form>

                            <button
                                type="button"
                                onClick={() => {
                                    console.log('Product farmer_id:', product.farmer_id);
                                    router.push(`/farmer/${product.farmer_id}/view`);
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-6 py-2.5 font-medium transition w-full mt-4"
                            >
                                VIEW FARMER PROFILE
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {paymentModalOpen && pendingOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        {!selectedMethod ? (
                            <>
                                <h2 className="text-2xl font-bold text-gray-900">Choose Payment Method</h2>
                                <p className="mt-2 text-sm text-gray-500">Please choose a payment option to complete your purchase of {product.name}.</p>

                                <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
                                    <div className="flex justify-between">
                                        <span>Quantity</span>
                                        <span className="font-semibold">{pendingOrder.quantity}</span>
                                    </div>
                                    <div className="mt-2 flex justify-between">
                                        <span>Total Price</span>
                                        <span className="font-semibold text-farmer-green">{formatMoney(pendingOrder.totalPrice)}</span>
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedMethod('paypal')}
                                        className="rounded-xl border border-blue-600 px-4 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition"
                                    >
                                        PayPal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedMethod('cbe')}
                                        className="rounded-xl border border-green-700 px-4 py-3 text-sm font-semibold text-green-700 hover:bg-green-50 transition"
                                    >
                                        CBE Bank Transfer
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={closePaymentModal}
                                    className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                            </>
                        ) : selectedMethod === 'paypal' ? (
                            <>
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-gray-900">Pay with PayPal</h2>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedMethod(null)}
                                        disabled={paymentProcessing}
                                        className="text-gray-500 hover:text-gray-700 disabled:opacity-50 text-sm font-semibold"
                                    >
                                        &larr; Back
                                    </button>
                                </div>
                                <p className="mt-2 text-sm text-gray-500">Pay securely with credit card or PayPal account.</p>

                                <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
                                    <div className="flex justify-between">
                                        <span>Amount to Pay</span>
                                        <span className="font-semibold text-farmer-green">{formatMoney(pendingOrder.totalPrice)}</span>
                                    </div>
                                </div>

                                {paymentMessage && (
                                    <div className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 font-medium">
                                        {paymentMessage}
                                    </div>
                                )}

                                <div className="mt-6 min-h-[150px]">
                                    {paypalLoading ? (
                                        <div className="flex flex-col items-center justify-center py-8">
                                            <div className="loader ease-linear rounded-full border-4 border-t-4 border-blue-600 h-10 w-10 mb-2 mx-auto"></div>
                                            <span className="text-sm text-gray-500">Loading PayPal SDK...</span>
                                        </div>
                                    ) : null}
                                    <div id="paypal-button-container" className={paypalLoading ? 'hidden' : ''}></div>
                                </div>

                                <button
                                    type="button"
                                    onClick={closePaymentModal}
                                    disabled={paymentProcessing}
                                    className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <form onSubmit={handleCbePaymentSubmit}>
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-gray-900">CBE Bank Transfer</h2>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedMethod(null)}
                                        disabled={paymentProcessing}
                                        className="text-gray-500 hover:text-gray-700 disabled:opacity-50 text-sm font-semibold"
                                    >
                                        &larr; Back
                                    </button>
                                </div>
                                <p className="mt-2 text-sm text-gray-500">Please send the exact amount to the following bank account, then enter your transaction reference below.</p>

                                <div className="mt-4 rounded-xl border border-[#3f6b4c] bg-green-900/10 p-4">
                                    <div className="space-y-2 text-sm text-gray-800">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Account Holder:</span>
                                            <span className="font-semibold text-gray-900">AgriSpark</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Account Number:</span>
                                            <span className="font-semibold text-gray-900 font-mono">1000598819298</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Bank:</span>
                                            <span className="font-semibold text-gray-900">Commercial Bank of Ethiopia (CBE)</span>
                                        </div>
                                        <div className="flex justify-between border-t pt-2 border-gray-300">
                                            <span className="text-gray-500 font-medium">Amount:</span>
                                            <span className="font-bold text-farmer-green">{formatMoney(pendingOrder.totalPrice)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">CBE Transaction Reference</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. FT23120..."
                                        value={cbeReference}
                                        onChange={(e) => setCbeReference(e.target.value)}
                                        disabled={paymentProcessing}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-buyer-blue focus:border-transparent outline-none disabled:opacity-50"
                                    />
                                </div>

                                {paymentMessage && (
                                    <div className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 font-medium">
                                        {paymentMessage}
                                    </div>
                                )}

                                <div className="mt-6 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={closePaymentModal}
                                        disabled={paymentProcessing}
                                        className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={paymentProcessing || !cbeReference.trim()}
                                        className="flex-1 rounded-xl bg-green-700 px-4 py-3 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-50 transition"
                                    >
                                        {paymentProcessing ? 'Verifying...' : 'Payment Done'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
