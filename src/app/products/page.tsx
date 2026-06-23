'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { formatMoney, resolveImageUrl } from '@/lib/utils';
import PublicNavbar from '@/components/PublicNavbar';
import { categories } from '@/lib/categories';

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

export default function PublicProductsPage() {
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<any>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedLocation, setSelectedLocation] = useState('All Locations');
    const [locationOptions, setLocationOptions] = useState<string[]>(['All Locations']);
    const [farmerLocationById, setFarmerLocationById] = useState<Record<string, string>>({});
    const [farmerRatingById, setFarmerRatingById] = useState<Record<string, { average: number; count: number }>>({});
    const [error, setError] = useState('');

    // categories imported from shared list (includes icons)

    const fetchProducts = useCallback(async () => {
        try {
            const [{ data: productRows, error: productError }, { data: farmerRows, error: farmerError }, { data: ratingRows, error: ratingError }] = await Promise.all([
                supabase
                    .from('products')
                    .select('*, users!inner(location, is_active)')
                    .eq('is_deleted', false)
                    .eq('is_under_review', false)
                    .gt('quantity', 0)
                    .eq('users.is_active', true)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('users')
                    .select('id, location')
                    .eq('role', 'farmer'),
                supabase
                    .from('ratings')
                    .select('farmer_id, stars'),
            ]);

            if (productError) throw productError;
            if (farmerError) throw farmerError;
            if (ratingError) throw ratingError;

            const farmerLocationMap = Object.fromEntries(
                (farmerRows || [])
                    .map((farmer: any) => [farmer.id, (farmer.location || '').trim()])
                    .filter(([, location]) => Boolean(location))
            ) as Record<string, string>;

            const uniqueLocations = Array.from(new Set(Object.values(farmerLocationMap))).sort((a, b) => a.localeCompare(b));

            const ratingAccumulator: Record<string, { total: number; count: number }> = {};
            ((ratingRows || []) as Array<{ farmer_id: string; stars: number }>).forEach((rating) => {
                if (!ratingAccumulator[rating.farmer_id]) {
                    ratingAccumulator[rating.farmer_id] = { total: 0, count: 0 };
                }
                ratingAccumulator[rating.farmer_id].total += Number(rating.stars || 0);
                ratingAccumulator[rating.farmer_id].count += 1;
            });

            const normalizedRatings: Record<string, { average: number; count: number }> = {};
            Object.entries(ratingAccumulator).forEach(([farmerId, stats]) => {
                normalizedRatings[farmerId] = {
                    average: stats.total / stats.count,
                    count: stats.count,
                };
            });

            const productsWithImages = await Promise.all(
                (productRows || []).map(async (p: any) => {
                    const rawProductLocation = String(p.location || '').trim();
                    const normalizedProductLocation = rawProductLocation && rawProductLocation.toLowerCase() !== 'not specified' ? rawProductLocation : '';
                    const farmerLocation = p.users?.location ? String(p.users.location).trim() : '';

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
        } catch (err: any) {
            setError(err?.message || 'Failed to load products');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const loadSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
        };

        loadSession();
        fetchProducts();
    }, [fetchProducts]);

    useEffect(() => {
        const matchesCategory = (product: Product) => selectedCategory === 'All' || product.category === selectedCategory;
        const matchesLocation = (product: Product) => {
            if (selectedLocation === 'All Locations') return true;
            const farmerLocation = farmerLocationById[product.farmer_id] || '';
            const productLocation = product.location || '';
            return farmerLocation === selectedLocation || productLocation === selectedLocation;
        };
        const matchesSearch = (product: Product) => product.name.toLowerCase().includes(searchTerm.trim().toLowerCase());

        setFilteredProducts(products.filter((product) => matchesCategory(product) && matchesLocation(product) && matchesSearch(product)));
    }, [selectedCategory, selectedLocation, searchTerm, products, farmerLocationById]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <PublicNavbar />
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="loader ease-linear rounded-full border-4 border-t-4 border-buyer-blue h-12 w-12 mb-4 mx-auto"></div>
                        <p className="text-gray-600">Loading products...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <PublicNavbar />

            <main className="max-w-7xl mx-auto px-4 py-6">
                <div className="bg-gradient-to-r from-farmer-green to-green-600 text-white rounded-lg p-6 mb-6">
                    <h1 className="text-3xl font-bold">Browse Products</h1>
                    <p className="text-green-100 mt-2">Explore fresh produce from verified farmers.</p>
                </div>

                <div className="mb-6 grid gap-4 lg:grid-cols-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Search products</label>
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search by product name"
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm outline-none focus:border-buyer-blue"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by category</label>
                        <select
                            value={selectedCategory}
                            onChange={(event) => setSelectedCategory(event.target.value)}
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm outline-none focus:border-buyer-blue"
                        >
                            {categories.map((c) => (
                                <option key={c.value} value={c.value}>
                                    {c.icon ? `${c.icon} ${c.label}` : c.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by location</label>
                        <select
                            value={selectedLocation}
                            onChange={(event) => setSelectedLocation(event.target.value)}
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm outline-none focus:border-buyer-blue"
                        >
                            {locationOptions.map((location) => (
                                <option key={location} value={location}>
                                    {location}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {filteredProducts.length === 0 ? (
                        <div className="col-span-full rounded-lg bg-white p-8 text-center shadow">
                            <p className="text-gray-500">No products found</p>
                        </div>
                    ) : (
                        filteredProducts.map((product) => (
                            <div key={product.id} className="bg-white rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow">
                                {product.resolved_image_url && (
                                    <img
                                        src={product.resolved_image_url}
                                        alt={product.name}
                                        className="w-full h-40 object-cover"
                                    />
                                )}
                                <div className="p-4">
                                    <h3 className="font-bold text-lg mb-1">{product.name}</h3>
                                    <p className="text-sm text-gray-500 mb-2">{product.category}</p>
                                    <p className="text-xs text-amber-700 mb-2 font-medium">
                                        {farmerRatingById[product.farmer_id]
                                            ? `⭐ ${farmerRatingById[product.farmer_id].average.toFixed(1)} (${farmerRatingById[product.farmer_id].count})`
                                            : 'No ratings yet'}
                                    </p>
                                    <p className="text-xs text-gray-400 mb-3">📍 {product.location}</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-bold text-buyer-blue">
                                            {product.pricing_type === 'per_kg'
                                                ? `${formatMoney(product.price)}/kg`
                                                : `${formatMoney(product.price)} per item`}
                                        </span>
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                            Stock: {product.quantity}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}
