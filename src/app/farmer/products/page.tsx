'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteProduct, getMyProfile, getProducts } from '@/lib/api';
import Header from '@/components/Header';
import { formatMoney, resolveImageUrl } from '@/lib/utils';

interface Product {
    id: string;
    name: string;
    category: string;
    quantity: number;
    price: number;
    location: string;
    image_url: string;
    resolved_image_url: string;
    is_under_review: boolean;
    pricing_type?: string;
    is_deleted?: boolean;
}

export default function FarmerProducts() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState<Product[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const userRow = await getMyProfile();

                if (!userRow) throw new Error('User profile not found');

                setProfile(userRow);

                const productRows = await getProducts({ mine: true });

                const productsWithImages = await Promise.all(
                    (productRows || []).map(async (p) => ({
                        ...p,
                        resolved_image_url: resolveImageUrl(p.image_url),
                    }))
                );

                setProducts(productsWithImages);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    const handleDelete = async (productId: string) => {
        const targetProduct = products.find((product) => product.id === productId);
        if (targetProduct?.is_under_review) {
            setError('Products under review cannot be deleted.');
            return;
        }

        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            await deleteProduct(productId);

            setProducts(products.filter((p) => p.id !== productId));
        } catch (err: any) {
            setError(err.message);
        }
    };

    const tabsConfig = [
        { name: 'home', href: '/farmer', icon: '🏠', label: 'Home' },
        { name: 'products', href: '/farmer/products', icon: '🧺', label: 'Products' },
        { name: 'create', href: '/farmer/create', icon: '➕', label: 'Create' },
        { name: 'orders', href: '/farmer/orders', icon: '🛒', label: 'Orders' },
        { name: 'chat', href: '/farmer/chat', icon: '💬', label: 'Chat' },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header role="farmer" userName={profile?.full_name} />
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="loader ease-linear rounded-full border-4 border-t-4 border-farmer-green h-12 w-12 mb-4 mx-auto"></div>
                        <p className="text-gray-600">Loading products...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Header role="farmer" userName={profile?.full_name} />

            <main className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">My Products</h1>
                    <button
                        onClick={() => router.push('/farmer/create')}
                        className="btn-primary btn-primary-farmer"
                    >
                        + Create Product
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                {products.length === 0 ? (
                    <div className="bg-white rounded-lg p-8 text-center">
                        <p className="text-gray-500 mb-4">No products yet</p>
                        <button
                            onClick={() => router.push('/farmer/create')}
                            className="btn-primary btn-primary-farmer"
                        >
                            Create Your First Product
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {products.map((product) => (
                            <div
                                key={product.id}
                                className="bg-white rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow"
                            >
                                {product.resolved_image_url && (
                                    <img
                                        src={product.resolved_image_url}
                                        alt={product.name}
                                        className="w-full h-40 object-cover"
                                    />
                                )}
                                <div className="p-4">
                                    <div className="mb-1 flex items-center justify-between gap-2">
                                        <h3 className="font-bold text-lg">{product.name}</h3>
                                        {product.is_deleted ? (
                                            <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                                                Removed by admin
                                            </span>
                                        ) : (
                                            product.is_under_review && (
                                                <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                                                    Under Review
                                                </span>
                                            )
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 mb-2">{product.category}</p>
                                    <div className="mb-4">
                                        <p className="text-lg font-bold text-farmer-green">{
                                            product.pricing_type === 'per_kg'
                                                ? `${formatMoney(product.price)}/kg`
                                                : `${formatMoney(product.price)} per item`
                                        }</p>
                                        <p className="text-sm text-gray-600">Stock: {product.quantity}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => router.push(`/farmer/products/${product.id}`)}
                                            disabled={product.is_under_review}
                                            className="flex-1 bg-farmer-green text-white py-2 rounded hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(product.id)}
                                            disabled={product.is_under_review}
                                            className="flex-1 bg-red-500 text-white py-2 rounded hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Delete
                                        </button>
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
