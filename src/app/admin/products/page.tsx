'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getAdminProducts, updateAdminProduct } from '@/lib/api';
import { formatMoney } from '@/lib/utils';

interface ProductRow {
    id: string;
    farmer_id: string;
    name: string;
    category: string;
    quantity: number;
    price: number;
    is_deleted: boolean;
    pricing_type?: string;
}

export default function AdminProductsPage() {
    const [products, setProducts] = useState<ProductRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [farmerFilter, setFarmerFilter] = useState<'all' | string>('all');
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const productRows = await getAdminProducts();
            setProducts((productRows || []) as ProductRow[]);
        } catch (err: any) {
            setError(err?.message || 'Failed to load products.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const farmerNameById = useMemo(() => {
        const map = new Map<string, string>();
        products.forEach((product: any) => map.set(product.farmer_id, product.farmer_name || 'Unknown farmer'));
        return map;
    }, [products]);

    const filteredProducts = useMemo(() => {
        const q = search.trim().toLowerCase();
        return products.filter((product) => {
            const matchesSearch = !q || (product.name || '').toLowerCase().includes(q);
            const matchesFarmer = farmerFilter === 'all' ? true : product.farmer_id === farmerFilter;
            return matchesSearch && matchesFarmer;
        });
    }, [products, search, farmerFilter]);

    const toggleProductDeleted = async (product: ProductRow) => {
        setActionLoadingId(product.id);

        try {
            const nextDeleted = !(product.is_deleted === true);
            await updateAdminProduct(product.id, { is_deleted: nextDeleted });

            await fetchData();
        } catch (err: any) {
            alert(err?.message || 'Failed to update product status.');
        } finally {
            setActionLoadingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-7xl">
                <h1 className="text-3xl font-bold text-gray-900">Admin Products</h1>
                <p className="mt-1 text-sm text-gray-500">Search, filter, and soft-delete or restore products.</p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by product name"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                    <select
                        value={farmerFilter}
                        onChange={(event) => setFarmerFilter(event.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    >
                        <option value="all">All Farmers</option>
                        {Array.from(farmerNameById.entries()).map(([farmerId, farmerName]) => (
                            <option key={farmerId} value={farmerId}>{farmerName || 'Unknown farmer'}</option>
                        ))}
                    </select>
                </div>

                {error && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <table className="w-full">
                        <thead className="bg-indigo-700 text-white">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Product</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Farmer</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">Category</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold">Price</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold">Stock</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">Loading products...</td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">No products match current filters.</td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => {
                                    const isDeleted = product.is_deleted === true;
                                    const isLoading = actionLoadingId === product.id;

                                    return (
                                        <tr key={product.id} className="border-t border-gray-100">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{product.name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{farmerNameById.get(product.farmer_id) || 'Unknown farmer'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{product.category || '—'}</td>
                                            <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{
                                                product.pricing_type === 'per_kg'
                                                    ? `${formatMoney(product.price || 0)}/kg`
                                                    : `${formatMoney(product.price || 0)} per item`
                                            }</td>
                                            <td className="px-4 py-3 text-center text-sm text-gray-700">{product.quantity ?? 0}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${isDeleted ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {isDeleted ? 'deleted' : 'active'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Link
                                                        href={`/admin/farmer/${product.farmer_id}`}
                                                        className="rounded bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700"
                                                    >
                                                        View Farmer Profile
                                                    </Link>
                                                    <button
                                                        onClick={() => toggleProductDeleted(product)}
                                                        disabled={isLoading}
                                                        className={`rounded px-3 py-1 text-xs font-semibold text-white ${isDeleted ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50`}
                                                    >
                                                        {isLoading ? 'Saving...' : isDeleted ? 'Restore' : 'Delete'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
