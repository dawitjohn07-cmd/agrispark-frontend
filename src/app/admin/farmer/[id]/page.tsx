'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { formatMoney, getInitials, PROFILE_MEDIA_BUCKET, resolveImageUrl, resolvePublicStorageUrl } from '@/lib/utils';

interface FarmerProfile {
    id: string;
    full_name: string;
    farm_name: string;
    business_name: string;
    location: string;
    phone_number: string;
    email: string;
    avatar_url: string;
    cover_url: string;
    created_at: string;
    bio?: string;
    about?: string;
    description?: string;
}

interface FarmerProduct {
    id: string;
    name: string;
    category: string;
    quantity: number;
    price: number;
    location: string;
    image_url: string;
    created_at: string;
    is_under_review: boolean;
    pricing_type?: string;
}

export default function AdminFarmerProfilePage() {
    const params = useParams();
    const farmerId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [farmer, setFarmer] = useState<FarmerProfile | null>(null);
    const [products, setProducts] = useState<FarmerProduct[]>([]);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setError('');

            const [{ data: profileRow, error: profileError }, { data: productRows, error: productError }] = await Promise.all([
                supabase.from('users').select('*').eq('id', farmerId).maybeSingle(),
                supabase
                    .from('products')
                    .select('id, name, category, quantity, price, pricing_type, location, image_url, created_at, is_under_review')
                    .eq('farmer_id', farmerId)
                    .order('created_at', { ascending: false }),
            ]);

            if (profileError) throw profileError;
            if (productError) throw productError;
            if (!profileRow) throw new Error('Farmer profile not found.');

            setFarmer(profileRow as FarmerProfile);
            setProducts((productRows || []) as FarmerProduct[]);
        } catch (err: any) {
            setError(err?.message || 'Failed to load farmer profile.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (farmerId) fetchData();
    }, [farmerId]);

    const toggleProductUnderReview = async (product: FarmerProduct) => {
        setActionLoadingId(product.id);

        try {
            const { data: authData } = await supabase.auth.getUser();
            const adminId = authData?.user?.id;
            if (!adminId) throw new Error('Admin not authenticated.');

            const nextUnderReview = !(product.is_under_review === true);
            const { error: updateError } = await supabase
                .from('products')
                .update({ is_under_review: nextUnderReview })
                .eq('id', product.id);

            if (updateError) throw updateError;

            await supabase.from('admin_logs').insert({
                admin_id: adminId,
                action: nextUnderReview ? 'set_product_under_review' : 'restore_product_from_review',
                target_id: product.id,
            });

            setProducts((currentProducts) =>
                currentProducts.map((currentProduct) =>
                    currentProduct.id === product.id ? { ...currentProduct, is_under_review: nextUnderReview } : currentProduct
                )
            );
        } catch (err: any) {
            alert(err?.message || 'Failed to update product status.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const displayName = farmer?.farm_name || farmer?.business_name || farmer?.full_name || 'Farmer';
    const avatarUrl = resolvePublicStorageUrl(farmer?.avatar_url || '', PROFILE_MEDIA_BUCKET);
    const coverUrl = resolvePublicStorageUrl(farmer?.cover_url || '', PROFILE_MEDIA_BUCKET);
    const joinDate = farmer?.created_at ? new Date(farmer.created_at).toLocaleDateString() : 'Unknown';

    const categories = useMemo(
        () => Array.from(new Set(products.map((product) => product.category).filter(Boolean))),
        [products]
    );

    const activeProducts = products.filter((product) => Number(product.quantity) > 0 && product.is_under_review !== true).length;

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 px-4 py-10">
                <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-sm">Loading farmer profile...</div>
            </div>
        );
    }

    if (error || !farmer) {
        return (
            <div className="min-h-screen bg-slate-100 px-4 py-10">
                <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm">
                    <h1 className="text-2xl font-bold text-slate-900">Farmer profile unavailable</h1>
                    <p className="mt-2 text-sm text-red-600">{error || 'The requested profile could not be found.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 pb-12">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
                <section className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200">
                    <div className="relative h-56 bg-gradient-to-br from-indigo-900 via-indigo-700 to-violet-600">
                        {coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={coverUrl} alt="Farmer cover" className="h-full w-full object-cover" />
                        ) : null}
                        <div className="absolute inset-0 bg-black/20" />

                        <div className="absolute bottom-0 left-0 w-full px-6 pb-6 sm:px-8">
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                                <div className="flex items-end gap-4 text-white">
                                    <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-white shadow-xl">
                                        {avatarUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-indigo-100 text-indigo-700 text-3xl font-bold">
                                                {getInitials(displayName)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="pb-2 drop-shadow">
                                        <p className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                                            Farmer
                                        </p>
                                        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{displayName}</h1>
                                        <p className="mt-1 text-sm text-white/85">{farmer.location || 'Location not shared'}</p>
                                        <p className="mt-1 text-xs text-white/80">Member since {joinDate}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-slate-900 sm:grid-cols-4">
                                    <TrustCard label="Total products" value={products.length} />
                                    <TrustCard label="Active products" value={activeProducts} />
                                    <TrustCard label="Categories" value={categories.length} />
                                    <TrustCard label="Admin access" value="Enabled" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {(farmer.bio || farmer.about || farmer.description) && (
                        <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
                            <h2 className="text-lg font-bold text-slate-900">About the farmer</h2>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                                {farmer.bio || farmer.about || farmer.description}
                            </p>
                        </div>
                    )}

                    <div className="grid gap-4 border-b border-slate-100 bg-slate-50 px-6 py-5 sm:grid-cols-3 sm:px-8">
                        <InfoPill label="Farm / business" value={displayName} />
                        <InfoPill label="General location" value={farmer.location || 'Not shared'} />
                        <InfoPill label="Join date" value={joinDate} />
                    </div>

                    <div className="grid gap-4 border-b border-slate-100 px-6 py-5 sm:grid-cols-2 sm:px-8">
                        <InfoPill label="Role" value="Farmer" />
                        <InfoPill label="Phone" value={farmer.phone_number || 'Hidden'} />
                        <InfoPill label="Email" value={farmer.email || 'Hidden'} />
                        <InfoPill label="Farm name" value={farmer.farm_name || 'Not shared'} />
                    </div>
                </section>

                <section className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200 p-6 sm:p-8">
                    <div className="flex items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Products by this Farmer</h2>
                            <p className="mt-1 text-sm text-slate-500">Admin view with under-review and restore controls.</p>
                        </div>
                        {categories.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {categories.map((category) => (
                                    <span key={category} className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                                        {category}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {products.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
                            This farmer has not posted any products yet.
                        </div>
                    ) : (
                        <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                            {products.map((product) => {
                                const isUnderReview = product.is_under_review === true;
                                const isLoading = actionLoadingId === product.id;

                                return (
                                    <article key={product.id} className={`overflow-hidden rounded-2xl border ${isUnderReview ? 'border-red-200 bg-red-50/20' : 'border-slate-200 bg-white'} shadow-sm transition hover:shadow-lg`}>
                                        <div className="h-44 bg-slate-100">
                                            {resolveImageUrl(product.image_url) ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={resolveImageUrl(product.image_url)}
                                                    alt={product.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : null}
                                        </div>
                                        <div className="space-y-3 p-5">
                                            <div className="flex items-center justify-between gap-3">
                                                <h3 className="text-lg font-bold text-slate-900">{product.name}</h3>
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                                    {product.category}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-500">📍 {product.location || 'Location not shared'}</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-lg font-bold text-indigo-700">{
                                                    product.pricing_type === 'per_kg'
                                                        ? `${formatMoney(product.price)}/kg`
                                                        : `${formatMoney(product.price)} per item`
                                                }</span>
                                                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                                                    {product.quantity} units
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400">Posted {new Date(product.created_at).toLocaleDateString()}</p>
                                            <div className="flex items-center justify-between">
                                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isUnderReview ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                    {isUnderReview ? 'Under Review' : 'Active'}
                                                </span>
                                                <button
                                                    onClick={() => toggleProductUnderReview(product)}
                                                    disabled={isLoading}
                                                    className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${isUnderReview ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-60`}
                                                >
                                                    {isLoading ? 'Saving...' : isUnderReview ? 'Restore' : 'Delete'}
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

function TrustCard({ label, value }: { label: string; value: string | number; }) {
    return (
        <div className="rounded-2xl bg-white opacity-95 px-4 py-4 shadow-lg ring-1 ring-black/5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{value}</p>
        </div>
    );
}

function InfoPill({ label, value }: { label: string; value: string; }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
        </div>
    );
}
