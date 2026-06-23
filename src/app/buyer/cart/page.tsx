'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { formatMoney } from '@/lib/utils';
import { CART_UPDATED_EVENT, CartProduct, getCartItems, removeFromCart, saveCartItems } from '@/lib/cart';
import { getProductById } from '@/lib/api';

export default function BuyerCartPage() {
    const router = useRouter();
    const [cartItems, setCartItems] = useState<CartProduct[]>([]);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const syncCart = () => {
            setCartItems(getCartItems());
        };

        const validateCartItems = async () => {
            const currentItems = getCartItems();

            if (!currentItems.length) {
                setMessage('');
                setCartItems([]);
                return;
            }

            const results = await Promise.all(
                currentItems.map(async (item) => {
                    try {
                        const product = await getProductById(item.id);
                        return { item, isValid: Number(product?.quantity ?? 0) > 0 };
                    } catch {
                        return { item, isValid: false };
                    }
                })
            );

            const validItems = results.filter((result) => result.isValid).map((result) => result.item);
            const removedCount = currentItems.length - validItems.length;

            if (removedCount > 0) {
                saveCartItems(validItems);
                setMessage(
                    removedCount === 1
                        ? '1 unavailable product was removed from your cart.'
                        : `${removedCount} unavailable products were removed from your cart.`
                );
            } else {
                setMessage('');
                setCartItems(validItems);
            }
        };

        syncCart();
        validateCartItems();
        window.addEventListener(CART_UPDATED_EVENT, syncCart);
        window.addEventListener('storage', syncCart);

        return () => {
            window.removeEventListener(CART_UPDATED_EVENT, syncCart);
            window.removeEventListener('storage', syncCart);
        };
    }, []);

    const handleRemove = (productId: string) => {
        removeFromCart(productId);
        setCartItems((current) => current.filter((item) => item.id !== productId));
    };

    return (
        <div className="min-h-screen bg-[#0f1a0f] pb-12 text-white">
            <Header role="buyer" />

            <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
                <section className="rounded-[16px] border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-lg font-semibold text-gray-900">🛒 My Cart</p>
                            <p className="mt-1 text-sm text-gray-600">Products you added from the marketplace.</p>
                        </div>
                        <p className="text-sm text-gray-600">{cartItems.length} items</p>
                    </div>

                    {message && (
                        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                            {message}
                        </div>
                    )}

                    {cartItems.length === 0 ? (
                        <div className="mt-6 rounded-2xl border border-dashed border-[#2d4a2d] p-10 text-center">
                            <p className="text-lg font-semibold text-white">Your cart is empty</p>
                            <button
                                onClick={() => router.push('/buyer')}
                                className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                            >
                                Back to Browse Products
                            </button>
                        </div>
                    ) : (
                        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {cartItems.map((product) => (
                                <div
                                    key={product.id}
                                    className="group overflow-hidden rounded-[16px] border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:border-[#4ade80]/50 hover:shadow-md"
                                >
                                    {product.resolved_image_url && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={product.resolved_image_url} alt={product.name} className="h-40 w-full object-cover" />
                                    )}
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900">{product.name}</h3>
                                                <p className="mt-1 text-sm text-gray-600">{product.category}</p>
                                            </div>
                                            <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${product.quantity <= 5
                                                ? 'border-red-300 bg-red-50 text-red-600'
                                                : 'border-green-300 bg-green-50 text-green-700'
                                                }`}>
                                                Stock: {product.quantity}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-xs text-gray-600">📍 {product.location}</p>
                                        <div className="mt-4 flex items-center justify-between gap-3">
                                            <span className="text-lg font-bold text-green-600">
                                                {product.pricing_type === 'per_kg'
                                                    ? `${formatMoney(product.price)}/kg`
                                                    : `${formatMoney(product.price)} per item`}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => router.push(`/buyer/product/${product.id}`)}
                                                    className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                                                >
                                                    View Details
                                                </button>
                                                <button
                                                    onClick={() => handleRemove(product.id)}
                                                    className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
