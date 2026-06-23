'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getFarmerById } from '@/lib/api';
import { formatMoney, getInitials, PROFILE_MEDIA_BUCKET, resolveImageUrl, resolvePublicStorageUrl } from '@/lib/utils';

interface PublicFarmerProfileProps {
    farmerId: string;
}

export default function PublicFarmerProfile({ farmerId }: PublicFarmerProfileProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [farmer, setFarmer] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [averageRating, setAverageRating] = useState<number | null>(null);
    const [ratingCount, setRatingCount] = useState(0);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError('');

            try {
                const response = await getFarmerById(farmerId);
                const productRows = response?.products || [];
                const farmerData = response?.farmer || null;
                const count = Number(response?.ratings?.count || 0);
                const avg = count > 0 ? Number(response?.ratings?.average || 0) : null;

                setRatingCount(count);
                setAverageRating(avg);

                setFarmer(farmerData || {
                    id: farmerId,
                    full_name: 'Farmer',
                    farm_name: 'Farmer',
                    location: productRows?.[0]?.location || '',
                    avatar_url: '',
                    cover_url: '',
                    created_at: productRows?.[0]?.created_at || new Date().toISOString(),
                });
                setProducts(productRows || []);
            } catch (err: any) {
                setError(err?.message || 'Could not load farmer profile.');
            } finally {
                setLoading(false);
            }
        };

        if (farmerId) load();
    }, [farmerId]);

    const displayName = farmer?.farm_name || farmer?.business_name || farmer?.full_name || 'Farmer';
    const avatarUrl = resolvePublicStorageUrl(farmer?.avatar_url || '', PROFILE_MEDIA_BUCKET);
    const coverUrl = resolvePublicStorageUrl(farmer?.cover_url || '', PROFILE_MEDIA_BUCKET);
    const joinDate = farmer?.created_at ? new Date(farmer.created_at).toLocaleDateString() : 'Unknown';
    const contactPhone = farmer?.phone_number || '';
    const contactEmail = farmer?.email || '';

    const categories = useMemo(
        () => Array.from(new Set(products.map((product) => product.category).filter(Boolean))),
        [products]
    );

    const activeProducts = products.filter((product) => Number(product.quantity) > 0).length;

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 px-4 py-10">
                <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-sm">Loading farmer profile...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-100 px-4 py-10">
                <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm">
                    <h1 className="text-2xl font-bold text-slate-900">Farmer profile unavailable</h1>
                    <p className="mt-2 text-sm text-red-600">{error || 'The requested profile could not be found.'}</p>
                    <Link href="/buyer" className="mt-6 inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-white">
                        Back to marketplace
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 pb-12">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
                {/* Farmer Information Card - Full Width */}
                <section className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200">
                    <div className="relative h-56 bg-gradient-to-br from-emerald-900 via-green-700 to-lime-600">
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
                                            <div className="flex h-full w-full items-center justify-center bg-emerald-100 text-emerald-700 text-3xl font-bold">
                                                {getInitials(displayName)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="pb-2 drop-shadow">
                                        <p className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                                            Farmer
                                        </p>
                                        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{displayName}</h1>
                                        <p className="mt-1 text-sm font-semibold text-white/90">
                                            {averageRating !== null ? `⭐ ${averageRating.toFixed(1)} (${ratingCount} ratings)` : 'No ratings yet'}
                                        </p>
                                        <p className="mt-1 text-sm text-white/85">{farmer.location || 'Location not shared'}</p>
                                        <p className="mt-1 text-xs text-white/80">Member since {joinDate}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-slate-900 sm:grid-cols-4">
                                    <TrustCard label="Total products" value={products.length} />
                                    <TrustCard label="Active products" value={activeProducts} />
                                    <TrustCard label="Categories" value={categories.length} />
                                    <TrustCard label="Markets trust" value="Verified" />
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
                        <InfoPill label="Phone" value={contactPhone || 'Hidden'} />
                        <InfoPill label="Email" value={contactEmail || 'Hidden'} />
                        <InfoPill label="Farm name" value={farmer.farm_name || 'Not shared'} />
                    </div>
                </section>

                {/* Products Section - Separate Below */}
                <section className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200 p-6 sm:p-8">
                    <div className="flex items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Products by this Farmer</h2>
                            <p className="mt-1 text-sm text-slate-500">All products posted by this farmer.</p>
                        </div>
                        {categories.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {categories.map((category) => (
                                    <span key={category} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
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
                            {products.map((product) => (
                                <article key={product.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg">
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
                                            <span className="text-lg font-bold text-emerald-600">{
                                                product.pricing_type === 'per_kg'
                                                    ? `${formatMoney(product.price)}/kg`
                                                    : `${formatMoney(product.price)} per item`
                                            }</span>
                                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                {product.quantity} units
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400">Posted {new Date(product.created_at).toLocaleDateString()}</p>
                                        <Link
                                            href={`/buyer/product/${product.id}`}
                                            className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                                        >
                                            View details
                                        </Link>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

function TrustCard({ label, value }: { label: string; value: string | number; }) {
    return (
        <div className="rounded-2xl bg-white/95 px-4 py-4 shadow-lg ring-1 ring-black/5">
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
