'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getMyProfile, getProducts } from '@/lib/api';
import Header from '@/components/Header';
import { formatMoney, resolveImageUrl } from '@/lib/utils';
import { addToCart, CART_UPDATED_EVENT, getCartItems } from '@/lib/cart';

interface Product {
    id: string;
    name: string;
    category: string;
    quantity: number;
    price: number;
    location: string;
    image_url: string;
    resolved_image_url: string;
    farmer_id: string;
    pricing_type?: string;
}

export default function BuyerHome() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedLocation, setSelectedLocation] = useState('');
    const [locationOptions, setLocationOptions] = useState<string[]>(['All Locations']);
    const [farmerLocationById, setFarmerLocationById] = useState<Record<string, string>>({});
    const [farmerRatingById, setFarmerRatingById] = useState<Record<string, { average: number; count: number }>>({});
    const [cartIds, setCartIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState('');

    const categories = ['All', 'Cereals', 'Vegetables', 'Fruits', 'Legumes', 'Dairy', 'Livestock', 'Animals', 'Animal Products'];

    const fetchProducts = useCallback(async () => {
        try {
            const productRows = await getProducts();

            const farmerLocationMap = Object.fromEntries(
                (productRows || [])
                    .map((product: any) => [product.farmer_id, (product.farmer_location || '').trim()])
                    .filter(([, location]) => Boolean(location))
            ) as Record<string, string>;

            const uniqueLocations = Array.from(new Set(Object.values(farmerLocationMap))).sort((a, b) => a.localeCompare(b));

            const normalizedRatings: Record<string, { average: number; count: number }> = {};
            (productRows || []).forEach((product: any) => {
                const farmerId = product.farmer_id;
                if (!farmerId || normalizedRatings[farmerId]) return;
                normalizedRatings[farmerId] = {
                    average: Number(product.farmer_rating_average || 0),
                    count: Number(product.farmer_rating_count || 0),
                };
            });

            const productsWithImages = await Promise.all(
                (productRows || []).map(async (p: any) => {
                    const rawProductLocation = String(p.location || '').trim();
                    const normalizedProductLocation = rawProductLocation && rawProductLocation.toLowerCase() !== 'not specified' ? rawProductLocation : '';
                    const farmerLocation = p.farmer_location ? String(p.farmer_location).trim() : '';

                    return {
                        ...p,
                        resolved_image_url: resolveImageUrl(p.image_url),
                        location: normalizedProductLocation || farmerLocation || '',
                    };
                })
            );

            setProducts(productsWithImages);
            setFilteredProducts(productsWithImages);
            setFarmerLocationById(farmerLocationMap);
            setFarmerRatingById(normalizedRatings);
            setLocationOptions(['All Locations', ...uniqueLocations]);

            // Optionally fetch authenticated buyer profile
            try {
                const userRow = await getMyProfile();
                if (userRow) {
                    setProfile(userRow);
                }
            } catch (authErr) {
                // Silently fail auth check - products load anyway
                console.log('Auth check failed:', authErr);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    useEffect(() => {
        const syncCartIds = () => {
            const ids = new Set(getCartItems().map((item) => item.id));
            setCartIds(ids);
        };

        syncCartIds();
        window.addEventListener(CART_UPDATED_EVENT, syncCartIds);
        window.addEventListener('storage', syncCartIds);

        return () => {
            window.removeEventListener(CART_UPDATED_EVENT, syncCartIds);
            window.removeEventListener('storage', syncCartIds);
        };
    }, []);

    // Filter products by category
    useEffect(() => {
        const matchesCategory = (product: Product) => selectedCategory === 'All' || product.category === selectedCategory;
        const matchesLocation = (product: Product) => {
            if (!selectedLocation || selectedLocation.trim() === '' || selectedLocation.toLowerCase() === 'all locations') return true;
            const farmerLocation = (farmerLocationById[product.farmer_id] || product.location || '').toLowerCase();
            return farmerLocation.includes(selectedLocation.trim().toLowerCase());
        };
        const matchesSearch = (product: Product) =>
            product.name.toLowerCase().includes(searchTerm.trim().toLowerCase());

        setFilteredProducts(products.filter((product) => matchesCategory(product) && matchesLocation(product) && matchesSearch(product)));
    }, [selectedCategory, selectedLocation, searchTerm, products, farmerLocationById]);

    const visibleProducts = filteredProducts.slice(0, 10);

    const handleAddToCart = (product: Product) => {
        addToCart(product);
        setCartIds((current) => new Set([...current, product.id]));
    };

    const tabsConfig = [
        { name: 'home', href: '/buyer', icon: '🏠', label: 'Home' },
        { name: 'orders', href: '/buyer/orders', icon: '🛒', label: 'Orders' },
        { name: 'chat', href: '/buyer/chat', icon: '💬', label: 'Chat' },
        { name: 'profile', href: '/buyer/profile', icon: '👤', label: 'Profile' },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f1a0f] text-white">
                <Header role="buyer" userName={profile?.full_name} />
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#274227] border-t-[#4ade80]"></div>
                        <p className="text-slate-300">Loading products...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f1a0f] pb-12 text-white">
            <Header role="buyer" userName={profile?.full_name} />

            <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
                <section className="mt-6 grid gap-4">
                    <div className="rounded-[16px] border border-gray-200 bg-white p-5 shadow-sm">
                        <p className="text-lg font-semibold text-gray-900">Search and Filters</p>
                        <div className="mt-4 flex flex-col gap-3">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <input
                                    type="search"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Search by product name"
                                    className="flex-1 min-w-0 rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#4ade80]"
                                />

                                <input
                                    type="text"
                                    value={selectedLocation}
                                    onChange={(event) => setSelectedLocation(event.target.value)}
                                    placeholder="Filter by location (e.g. Addis Ababa)"
                                    className="w-full sm:w-auto sm:min-w-[160px] rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus:border-[#4ade80]"
                                />
                            </div>

                            <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${selectedCategory === cat
                                            ? 'border-[#4ade80] bg-[#4ade80] text-[#071007]'
                                            : 'border-gray-300 bg-white text-gray-700 hover:border-[#4ade80]/60 hover:text-gray-900'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {error && (
                    <div className="mb-4 rounded-2xl border border-red-900/40 bg-red-950/30 p-4 text-red-200">
                        {error}
                    </div>
                )}

                <section className="mt-6 rounded-[16px] border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-lg font-semibold text-gray-900">Curated Local Picks</p>
                            <p className="mt-1 text-sm text-gray-600">Browse curated products from active farmers.</p>
                        </div>
                        <p className="text-sm text-gray-600">{visibleProducts.length} results</p>
                    </div>

                    {visibleProducts.length === 0 ? (
                        <div className="mt-4 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-600">
                            No products found
                        </div>
                    ) : (
                        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {visibleProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className="group cursor-pointer overflow-hidden rounded-[16px] border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:border-[#4ade80]/50 hover:shadow-md"
                                    onClick={() => router.push(`/buyer/product/${product.id}`)}
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
                                        <p className="mt-3 text-xs font-medium text-amber-400">
                                            {farmerRatingById[product.farmer_id]
                                                ? `⭐ ${farmerRatingById[product.farmer_id].average.toFixed(1)} (${farmerRatingById[product.farmer_id].count})`
                                                : 'No ratings yet'}
                                        </p>
                                        <p className="mt-2 text-xs text-gray-600">📍 {product.location}</p>
                                        <div className="mt-4 flex items-center justify-between gap-3">
                                            <span className="text-lg font-bold text-green-600">{
                                                product && product.pricing_type === 'per_kg'
                                                    ? `${formatMoney(product.price)}/kg`
                                                    : `${formatMoney(product.price)} per item`
                                            }</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!cartIds.has(product.id)) {
                                                        handleAddToCart(product);
                                                    }
                                                }}
                                                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${cartIds.has(product.id)
                                                    ? 'bg-[#1f331f] text-[#4ade80] border border-[#4ade80]/40'
                                                    : 'bg-[#4ade80] text-[#071007] hover:shadow-[0_0_18px_rgba(74,222,128,0.25)]'
                                                    }`}
                                            >
                                                {cartIds.has(product.id) ? '✓ Added' : '🛒 Add to Cart'}
                                            </button>
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

