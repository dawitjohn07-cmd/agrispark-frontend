'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getFarmerRatings, getMyProfile, getOrders, getProducts } from '@/lib/api';
import Header from '@/components/Header';
import { formatMoney, getInitials, resolveImageUrl } from '@/lib/utils';

interface Product {
    id: string;
    name: string;
    category: string;
    quantity: number;
    price: number;
    location: string;
    image_url: string;
    resolved_image_url: string;
    created_at: string;
    is_under_review: boolean;
    pricing_type?: string;
}

interface Profile {
    id: string;
    full_name: string;
    role: string;
    location: string;
}

const lowStockThreshold = 5;

export default function FarmerDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [profile, setProfile] = useState<Profile | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [pendingOrders, setPendingOrders] = useState(0);
    const [averageRating, setAverageRating] = useState<number | null>(null);
    const [ratingCount, setRatingCount] = useState(0);

    const fetchDashboard = useCallback(async () => {
        setError('');

        const userRow = await getMyProfile();
        if (!userRow?.id) throw new Error('Farmer profile not found.');
        if (userRow.role !== 'farmer') throw new Error('Only farmer accounts can access this dashboard.');

        setProfile(userRow);

        // Fetch products
        const [productRows, ratingsSummary, orderRows] = await Promise.all([
            getProducts({ mine: true }),
            getFarmerRatings(userRow.id),
            getOrders(),
        ]);

        const safeProducts = await Promise.all(
            (productRows || []).map(async (item) => ({
                ...item,
                resolved_image_url: resolveImageUrl(item.image_url),
            }))
        );
        setProducts(safeProducts);

        const totalRatings = Number(ratingsSummary?.total_count || 0);
        setRatingCount(totalRatings);
        setAverageRating(totalRatings > 0 ? Number(ratingsSummary?.average_stars || 0) : null);

        if (!safeProducts.length) {
            setPendingOrders(0);
            return;
        }

        setPendingOrders((orderRows || []).length);
    }, []);

    const runInitialLoad = useCallback(async () => {
        try {
            setLoading(true);
            await fetchDashboard();
        } catch (loadError: any) {
            console.log('[FarmerHome] Load failed', loadError?.message);
            setError(loadError?.message || 'Could not load dashboard');
        } finally {
            setLoading(false);
        }
    }, [fetchDashboard]);

    const onRefresh = useCallback(async () => {
        try {
            setRefreshing(true);
            await fetchDashboard();
        } catch (refreshError: any) {
            console.log('[FarmerHome] Refresh failed', refreshError?.message);
            setError(refreshError?.message || 'Refresh failed');
        } finally {
            setRefreshing(false);
        }
    }, [fetchDashboard]);

    useEffect(() => {
        runInitialLoad();
    }, [runInitialLoad]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="loader ease-linear rounded-full border-4 border-t-4 border-farmer-green h-12 w-12 mb-4 mx-auto"></div>
                    <p className="text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

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
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                {/* Welcome Banner */}
                <div className="bg-gradient-to-r from-farmer-green to-green-600 text-white rounded-lg p-6 mb-6">
                    <h1 className="text-3xl font-bold">Welcome back, {profile?.full_name}!</h1>
                    <p className="text-green-100 mt-2">📍 {profile?.location}</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 shadow-sm card-shadow">
                        <div className="text-sm text-gray-600">Active Listings</div>
                        <div className="text-3xl font-bold text-farmer-green">{products.length}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm card-shadow">
                        <div className="text-sm text-gray-600">Orders Today</div>
                        <div className="text-3xl font-bold text-farmer-green">{pendingOrders}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm card-shadow">
                        <div className="text-sm text-gray-600">Total Stock Value</div>
                        <div className="text-3xl font-bold text-farmer-green">
                            {formatMoney(
                                products.reduce((sum, p) => sum + p.price * p.quantity, 0)
                            )}
                        </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm card-shadow">
                        <div className="text-sm text-gray-600">Low Stock Items</div>
                        <div className="text-3xl font-bold text-farmer-green">
                            {products.filter((p) => p.quantity < lowStockThreshold).length}
                        </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm card-shadow">
                        <div className="text-sm text-gray-600">Buyer Rating</div>
                        <div className="text-2xl font-bold text-farmer-green">{averageRating !== null ? `⭐ ${averageRating.toFixed(1)}` : 'No ratings yet'}</div>
                        <div className="text-xs text-gray-500 mt-1">{ratingCount} total ratings</div>
                    </div>
                </div>

                {/* Recent Products */}
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Recent Products</h2>
                        <button
                            onClick={onRefresh}
                            disabled={refreshing}
                            className="text-farmer-green hover:text-green-700 disabled:opacity-50"
                        >
                            🔄 Refresh
                        </button>
                    </div>

                    {products.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500 mb-4">No products yet. Start by creating your first listing!</p>
                            <button
                                onClick={() => router.push('/farmer/create')}
                                className="btn-primary btn-primary-farmer"
                            >
                                Create Product
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {products.slice(0, 6).map((product) => (
                                <div
                                    key={product.id}
                                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                                    onClick={() => router.push(`/farmer/products/${product.id}`)}
                                >
                                    {product.resolved_image_url && (
                                        <img
                                            src={product.resolved_image_url}
                                            alt={product.name}
                                            className="w-full h-40 object-cover"
                                        />
                                    )}
                                    <div className="p-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="font-bold text-gray-900">{product.name}</h3>
                                            {product.is_under_review && (
                                                <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                                                    Under Review
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500">{product.category}</p>
                                        <div className="mt-2 flex justify-between items-center">
                                            <span className="font-bold text-farmer-green">{
                                                product.pricing_type === 'per_kg'
                                                    ? `${formatMoney(product.price)}/kg`
                                                    : `${formatMoney(product.price)} per item`
                                            }</span>
                                            <span
                                                className={`text-xs px-2 py-1 rounded-full ${product.quantity < lowStockThreshold
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-green-100 text-green-700'
                                                    }`}
                                            >
                                                Stock: {product.quantity}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
