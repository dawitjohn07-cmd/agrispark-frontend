'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getFarmerById } from '@/lib/api';
import { formatMoney, getInitials, PROFILE_MEDIA_BUCKET, resolveImageUrl, resolvePublicStorageUrl } from '@/lib/utils';

interface FarmerProfile {
    id: string;
    full_name: string;
    role: string;
    location: string;
    phone_number: string;
    email: string;
    farm_name: string;
    avatar_url: string;
    cover_url: string;
    created_at: string;
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
    pricing_type?: string;
}

export default function FarmerPublicViewPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [profile, setProfile] = useState<FarmerProfile | null>(null);
    const [products, setProducts] = useState<FarmerProduct[]>([]);
    const [averageRating, setAverageRating] = useState<number | null>(null);
    const [ratingCount, setRatingCount] = useState(0);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError('');

            try {
                console.log('Profile route id:', id);

                const response = await getFarmerById(id);
                const farmerRow = response?.farmer;
                if (!farmerRow) {
                    setError('Farmer profile not found');
                    setProfile(null);
                    setLoading(false);
                    return;
                }

                const productRows = response?.products || [];
                const count = Number(response?.ratings?.count || 0);
                const average = count > 0 ? Number(response?.ratings?.average || 0) : null;

                setProfile(farmerRow as FarmerProfile);
                setProducts((productRows || []) as FarmerProduct[]);
                setRatingCount(count);
                setAverageRating(average);
            } catch (err: any) {
                setError(err?.message || 'Failed to load farmer profile');
            } finally {
                setLoading(false);
            }
        };

        if (id) load();
    }, [id]);

    const coverUrl = useMemo(() => resolvePublicStorageUrl(profile?.cover_url || '', PROFILE_MEDIA_BUCKET), [profile?.cover_url]);
    const avatarUrl = useMemo(() => resolvePublicStorageUrl(profile?.avatar_url || '', PROFILE_MEDIA_BUCKET), [profile?.avatar_url]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="loader ease-linear rounded-full border-4 border-t-4 border-green-600 h-12 w-12 mb-4 mx-auto"></div>
                    <p className="text-gray-600">Loading farmer profile...</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-gray-50 px-4 py-8">
                <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                    <p className="text-red-600 text-lg font-semibold">{error || 'Farmer profile not found'}</p>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="mt-6 text-green-600 hover:text-green-800 font-medium"
                    >
                        ← Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-10 transition-colors">
            <div className="max-w-6xl mx-auto px-4 pt-6">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="text-green-600 hover:text-green-500 font-medium transition-colors"
                >
                    ← Back
                </button>
            </div>

            <div className="max-w-6xl mx-auto px-4 pt-4">
                <section className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
                    <div className="relative">
                        {coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={coverUrl} alt="Farmer cover" className="w-full h-48 object-cover" />
                        ) : (
                            <div className="w-full h-48 bg-gradient-to-r from-green-600 to-green-700" />
                        )}

                        <div className="absolute -bottom-14 left-6">
                            {avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={avatarUrl}
                                    alt={profile.full_name}
                                    className="w-28 h-28 rounded-full border-4 border-white shadow-lg object-cover"
                                />
                            ) : (
                                <div className="w-28 h-28 rounded-full border-4 border-white shadow-lg bg-green-600 text-white flex items-center justify-center text-3xl font-bold">
                                    {getInitials(profile.full_name || profile.farm_name || 'F')}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-16 px-6 pb-6 border-b border-gray-100 dark:border-gray-700 transition-colors">
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{profile.full_name || profile.farm_name || 'Farmer'}</h1>
                        <p className="mt-1 text-sm font-semibold text-gray-600 dark:text-gray-300">
                            {averageRating !== null ? `⭐ ${averageRating.toFixed(1)} (${ratingCount} ratings)` : 'No ratings yet'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Farmer</p>
                        <p className="text-gray-600 dark:text-gray-300 mt-2">📍 {profile.location || 'Location not provided'}</p>
                    </div>

                    <div className="p-6 flex flex-col gap-8">
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 p-5 transition-colors">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Farmer Information</h2>
                            <div className="space-y-3 text-sm">
                                <p className="text-gray-700 dark:text-gray-200"><span className="font-medium text-gray-900 dark:text-gray-100">📞 Phone:</span> {profile.phone_number || 'Not provided'}</p>
                                <p className="text-gray-700 dark:text-gray-200"><span className="font-medium text-gray-900 dark:text-gray-100">✉️ Email:</span> {profile.email || 'Not provided'}</p>
                                <p className="text-gray-700 dark:text-gray-200"><span className="font-medium text-gray-900 dark:text-gray-100">📍 Location:</span> {profile.location || 'Not provided'}</p>
                                <p className="text-gray-700 dark:text-gray-200"><span className="font-medium text-gray-900 dark:text-gray-100">🌾 Farm name:</span> {profile.farm_name || 'Not provided'}</p>
                                <p className="text-gray-700 dark:text-gray-200"><span className="font-medium text-gray-900 dark:text-gray-100">📅 Member since:</span> {new Date(profile.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Products by this Farmer</h2>

                            {products.length === 0 ? (
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 p-6 text-gray-500 dark:text-gray-400 text-center transition-colors">
                                    No products listed yet
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {products.map((item) => (
                                        <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm transition-colors hover:border-green-500 dark:hover:border-green-500">
                                            <div className="h-36 bg-gray-100 dark:bg-gray-700">
                                                {resolveImageUrl(item.image_url) ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={resolveImageUrl(item.image_url)} alt={item.name} className="w-full h-full object-cover" />
                                                ) : null}
                                            </div>
                                            <div className="p-4">
                                                <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{
                                                    item.pricing_type === 'per_kg'
                                                        ? `${formatMoney(item.price)}/kg`
                                                        : `${formatMoney(item.price)} per item`
                                                }</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Qty: {item.quantity}</p>
                                                <button
                                                    type="button"
                                                    onClick={() => router.push(`/buyer/product/${item.id}`)}
                                                    className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-2 text-sm font-medium transition"
                                                >
                                                    View Product
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
