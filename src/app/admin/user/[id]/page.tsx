'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getInitials, PROFILE_MEDIA_BUCKET, resolvePublicStorageUrl } from '@/lib/utils';

interface UserProfile {
    id: string;
    full_name: string;
    role: string;
    location: string;
    phone_number: string;
    email: string;
    avatar_url: string;
    cover_url: string;
    created_at: string;
    is_active: boolean;
}

export default function AdminGenericProfilePage() {
    const params = useParams();
    const router = useRouter();
    const userId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [user, setUser] = useState<UserProfile | null>(null);

    const fetchData = async () => {
        try {
            setError('');

            const { data, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (profileError) throw profileError;
            if (!data) throw new Error('User profile not found.');

            // If it's a farmer, ideally they should be using the farmer profile view,
            // but we can still render them here if they navigate manually.
            if (data.role === 'farmer') {
                router.replace(`/admin/farmer/${data.id}`);
                return;
            }

            setUser(data as UserProfile);
        } catch (err: any) {
            setError(err?.message || 'Failed to load profile.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) fetchData();
    }, [userId]);

    const displayName = user?.full_name || 'User';
    const avatarUrl = resolvePublicStorageUrl(user?.avatar_url || '', PROFILE_MEDIA_BUCKET);
    const coverUrl = resolvePublicStorageUrl(user?.cover_url || '', PROFILE_MEDIA_BUCKET);
    const joinDate = user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown';

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 px-4 py-10">
                <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-sm text-center">Loading user profile...</div>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="min-h-screen bg-slate-100 px-4 py-10">
                <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm">
                    <h1 className="text-2xl font-bold text-slate-900">Profile unavailable</h1>
                    <p className="mt-2 text-sm text-red-600">{error || 'The requested profile could not be found.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 pb-12">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
                <section className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200">
                    <div className="relative h-56 bg-gradient-to-br from-sky-900 via-blue-700 to-cyan-600">
                        {coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" />
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
                                            <div className="flex h-full w-full items-center justify-center bg-sky-100 text-sky-700 text-3xl font-bold">
                                                {getInitials(displayName)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="pb-2 drop-shadow">
                                        <p className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide">
                                            {user.role}
                                        </p>
                                        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{displayName}</h1>
                                        <p className="mt-1 text-sm text-white opacity-85">{user.location || 'Location not shared'}</p>
                                        <p className="mt-1 text-xs text-white opacity-80">Member since {joinDate}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 border-b border-slate-100 px-6 py-5 sm:grid-cols-2 sm:px-8">
                        <InfoPill label="Role" value={user.role} />
                        <InfoPill label="Status" value={user.is_active === false ? 'Inactive' : 'Active'} />
                        <InfoPill label="Phone" value={user.phone_number || 'Hidden'} />
                        <InfoPill label="Email" value={user.email || 'Hidden'} />
                    </div>
                </section>
            </div>
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
