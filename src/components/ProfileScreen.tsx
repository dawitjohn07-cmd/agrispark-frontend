'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getFarmerById, getMyProfile, updateMyProfile } from '@/lib/api';
import { getInitials, PROFILE_MEDIA_BUCKET, resolvePublicStorageUrl } from '@/lib/utils';

type ProfileRole = 'farmer' | 'buyer';
type UploadKind = 'avatar' | 'cover';

interface ProfileScreenProps {
    role: ProfileRole;
    userId?: string; // optional id to load a public profile
    readOnly?: boolean; // when true, disable uploads and edits
}

interface ProfileState {
    id: string;
    email: string;
    role: ProfileRole | string;
    full_name: string;
    phone_number: string;
    location: string;
    farm_name: string;
    avatar_url: string;
    cover_url: string;
    created_at: string;
}

const profileCopy = {
    farmer: {
        accent: 'from-green-600 to-emerald-600',
        border: 'border-green-200',
        button: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
        ring: 'focus:ring-green-500',
        badge: 'bg-green-100 text-green-700',
        label: 'Farmer',
        defaultInitial: 'F',
        coverFallback: 'from-emerald-900 via-green-700 to-lime-600',
    },
    buyer: {
        accent: 'from-sky-600 to-blue-600',
        border: 'border-sky-200',
        button: 'bg-sky-600 hover:bg-sky-700 focus:ring-sky-500',
        ring: 'focus:ring-sky-500',
        badge: 'bg-sky-100 text-sky-700',
        label: 'Buyer',
        defaultInitial: 'B',
        coverFallback: 'from-sky-900 via-blue-700 to-cyan-600',
    },
} as const;

export default function ProfileScreen({ role, userId, readOnly }: ProfileScreenProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [profile, setProfile] = useState<ProfileState | null>(null);
    const avatarInputRef = useRef<HTMLInputElement | null>(null);
    const coverInputRef = useRef<HTMLInputElement | null>(null);

    const theme = profileCopy[role];

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                if (userId) {
                    // public read-only profile load
                    console.log('Profile route id:', userId);
                    const response = await getFarmerById(userId);
                    const userRow = response?.farmer;
                    if (!userRow) throw new Error('Farmer profile not found.');

                    setProfile({
                        id: userRow.id,
                        email: userRow.email || '',
                        role: (userRow.role as ProfileRole) || role,
                        full_name: userRow.full_name || '',
                        phone_number: userRow.phone_number || '',
                        location: userRow.location || '',
                        farm_name: userRow.farm_name || '',
                        avatar_url: userRow.avatar_url || '',
                        cover_url: userRow.cover_url || '',
                        created_at: userRow.created_at || new Date().toISOString(),
                    });
                    return;
                }

                // default: load authenticated user's profile (editable)
                const { data: authData, error: authError } = await supabase.auth.getUser();
                const authUser = authData?.user;

                if (authError || !authUser?.id) {
                    throw new Error('Please sign in again to view your profile.');
                }

                const userRow = await getMyProfile();

                const fallbackProfile: ProfileState = {
                    id: authUser.id,
                    email: authUser.email || '',
                    role,
                    full_name: authUser.user_metadata?.full_name || '',
                    phone_number: authUser.user_metadata?.phone_number || '',
                    location: authUser.user_metadata?.location || '',
                    farm_name: authUser.user_metadata?.farm_name || authUser.user_metadata?.business_name || '',
                    avatar_url: authUser.user_metadata?.avatar_url || '',
                    cover_url: authUser.user_metadata?.cover_url || '',
                    created_at: authUser.created_at || new Date().toISOString(),
                };

                setProfile({
                    ...fallbackProfile,
                    ...(userRow || {}),
                    role: (userRow?.role || fallbackProfile.role) as ProfileRole,
                    email: userRow?.email || fallbackProfile.email,
                    full_name: userRow?.full_name || fallbackProfile.full_name,
                    phone_number: userRow?.phone_number || fallbackProfile.phone_number,
                    location: userRow?.location || fallbackProfile.location,
                    farm_name: userRow?.farm_name || fallbackProfile.farm_name,
                    avatar_url: userRow?.avatar_url || fallbackProfile.avatar_url,
                    cover_url: userRow?.cover_url || fallbackProfile.cover_url,
                    created_at: userRow?.created_at || fallbackProfile.created_at,
                });
            } catch (err: any) {
                setError(err?.message || 'Could not load profile.');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [role, userId]);

    const resolvedAvatar = useMemo(() => resolvePublicStorageUrl(profile?.avatar_url || '', PROFILE_MEDIA_BUCKET), [profile?.avatar_url]);
    const resolvedCover = useMemo(() => resolvePublicStorageUrl(profile?.cover_url || '', PROFILE_MEDIA_BUCKET), [profile?.cover_url]);

    const updateField = (field: keyof ProfileState, value: string) => {
        setProfile((current) => (current ? { ...current, [field]: value } : current));
    };

    const uploadProfileMedia = async (kind: UploadKind, file: File) => {
        setError('');
        setSuccess('');

        if (readOnly) {
            setError('Read-only profile: uploads disabled.');
            return;
        }

        try {
            const { data: authData, error: authError } = await supabase.auth.getUser();
            const authUser = authData?.user;

            if (authError || !authUser?.id) {
                throw new Error('Please sign in again before uploading media.');
            }

            const ext = file.name.split('.').pop() || 'jpg';
            const path = `profiles/${authUser.id}/${kind}-${Date.now()}.${ext}`;

            if (kind === 'avatar') setUploadingAvatar(true);
            if (kind === 'cover') setUploadingCover(true);

            const { error: uploadError } = await supabase.storage
                .from(PROFILE_MEDIA_BUCKET)
                .upload(path, file, { upsert: true, contentType: file.type });

            if (uploadError) throw new Error(getProfileStorageError(uploadError.message || 'Upload failed.'));

            const publicUrl = supabase.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;

            const nextProfile = profile
                ? {
                    ...profile,
                    ...(kind === 'avatar' ? { avatar_url: publicUrl } : { cover_url: publicUrl }),
                }
                : null;

            const profileRecord = nextProfile || {
                id: authUser.id,
                email: authUser.email || '',
                role,
                full_name: authUser.user_metadata?.full_name || '',
                phone_number: authUser.user_metadata?.phone_number || '',
                location: authUser.user_metadata?.location || '',
                farm_name: authUser.user_metadata?.farm_name || authUser.user_metadata?.business_name || '',
                avatar_url: kind === 'avatar' ? publicUrl : '',
                cover_url: kind === 'cover' ? publicUrl : '',
                created_at: authUser.created_at || new Date().toISOString(),
            };

            await updateMyProfile({
                full_name: profileRecord.full_name,
                phone_number: profileRecord.phone_number,
                location: profileRecord.location,
                farm_name: profileRecord.farm_name,
                avatar_url: kind === 'avatar' ? publicUrl : profileRecord.avatar_url,
                cover_url: kind === 'cover' ? publicUrl : profileRecord.cover_url,
            });

            setProfile((current) => {
                if (!current) {
                    return {
                        id: authUser.id,
                        email: authUser.email || '',
                        role,
                        full_name: authUser.user_metadata?.full_name || '',
                        phone_number: authUser.user_metadata?.phone_number || '',
                        location: authUser.user_metadata?.location || '',
                        farm_name: authUser.user_metadata?.farm_name || authUser.user_metadata?.business_name || '',
                        avatar_url: kind === 'avatar' ? publicUrl : '',
                        cover_url: kind === 'cover' ? publicUrl : '',
                        created_at: authUser.created_at || new Date().toISOString(),
                    };
                }

                return {
                    ...current,
                    ...(kind === 'avatar' ? { avatar_url: publicUrl } : { cover_url: publicUrl }),
                };
            });

            setSuccess(`${kind === 'avatar' ? 'Profile photo' : 'Cover photo'} updated successfully.`);
        } catch (err: any) {
            setError(err?.message || `Failed to upload ${kind === 'avatar' ? 'profile photo' : 'cover photo'}.`);
        } finally {
            setUploadingAvatar(false);
            setUploadingCover(false);
        }
    };

    const handleMediaChange = async (kind: UploadKind, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please choose a valid image file.');
            return;
        }

        await uploadProfileMedia(kind, file);
    };

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (!profile?.id) return;

        setSaving(true);

        try {
            const payload = {
                full_name: profile.full_name.trim(),
                phone_number: profile.phone_number.trim(),
                location: profile.location.trim(),
                farm_name: role === 'farmer' ? profile.farm_name.trim() : profile.farm_name,
                avatar_url: profile.avatar_url || '',
                cover_url: profile.cover_url || '',
            };

            const updated = await updateMyProfile(payload);
            setProfile((current) => (current ? { ...current, ...updated } : current));

            setSuccess('Profile saved successfully.');
        } catch (err: any) {
            setError(err?.message || 'Failed to save profile.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
                <div className="rounded-2xl bg-white px-6 py-5 shadow-lg text-slate-600">Loading profile...</div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
                <div className="max-w-md rounded-2xl bg-white p-6 shadow-lg text-center">
                    <p className="text-red-600 font-medium">{error || 'Profile data is unavailable.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl space-y-4">
                {error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        {success}
                    </div>
                )}

                <section className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200">
                    <div className={`relative h-64 bg-gradient-to-br ${resolvedCover ? '' : theme.coverFallback}`}>
                        {resolvedCover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={resolvedCover} alt="Cover" className="h-full w-full object-cover" />
                        ) : (
                            <div className={`absolute inset-0 bg-gradient-to-br ${theme.coverFallback}`} />
                        )}

                        <div className="absolute inset-0 bg-black/20" />

                        {!readOnly && (
                            <div className="absolute right-4 top-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => coverInputRef.current?.click()}
                                    disabled={uploadingCover}
                                    className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-[#0f1a0f] shadow-md transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {uploadingCover ? 'Uploading cover...' : 'Change cover'}
                                </button>
                            </div>
                        )}

                        <div className="absolute bottom-0 left-0 w-full translate-y-1/2 px-6 sm:px-8">
                            <div className="flex items-end gap-5">
                                <div className="relative">
                                    <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-white shadow-xl sm:h-32 sm:w-32">
                                        {resolvedAvatar ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={resolvedAvatar} alt="Profile photo" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${theme.accent} text-3xl font-bold text-white`}>
                                                {getInitials(profile.full_name || profile.email || theme.defaultInitial)}
                                            </div>
                                        )}
                                    </div>

                                    {!readOnly && (
                                        <button
                                            type="button"
                                            onClick={() => avatarInputRef.current?.click()}
                                            disabled={uploadingAvatar}
                                            className="absolute -bottom-1 -right-1 rounded-full border-4 border-white bg-white p-2 text-xs shadow-lg transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-70"
                                        >
                                            {uploadingAvatar ? '...' : '📷'}
                                        </button>
                                    )}
                                </div>

                                <div className="pb-3 text-white drop-shadow">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{profile.full_name || profile.email}</h1>
                                        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${theme.badge}`}>
                                            {profile.role || theme.label}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-white opacity-85">Member since {new Date(profile.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {!readOnly && (
                        <>
                            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleMediaChange('cover', event)} />
                            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleMediaChange('avatar', event)} />
                        </>
                    )}

                    <div className="grid gap-6 px-6 pb-6 pt-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
                        <div className="space-y-6">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">Profile details</h2>
                                        <p className="mt-1 text-sm text-slate-500">Review the information linked to your account.</p>
                                    </div>
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${theme.badge}`}>{theme.label}</span>
                                </div>

                                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                    <DetailItem label="Full name" value={profile.full_name || '—'} />
                                    <DetailItem label="Role" value={profile.role || theme.label} />
                                    <DetailItem label="Location" value={profile.location || '—'} />
                                    <DetailItem label="Phone" value={profile.phone_number || '—'} />
                                    <DetailItem label="Email" value={profile.email || '—'} />
                                    <DetailItem label="Member since" value={new Date(profile.created_at).toLocaleDateString()} />
                                    {role === 'farmer' && <DetailItem label="Farm name" value={profile.farm_name || '—'} />}
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Edit profile</h2>
                                    <p className="mt-1 text-sm text-slate-500">Fields are prefilled from your saved database record.</p>
                                </div>
                            </div>

                            <div className="mt-6 space-y-4">
                                <Field label="Full name" value={profile.full_name} onChange={readOnly ? undefined : (value) => updateField('full_name', value)} readOnly={!!readOnly} />
                                <Field label="Phone" value={profile.phone_number} onChange={readOnly ? undefined : (value) => updateField('phone_number', value)} readOnly={!!readOnly} />
                                <Field label="Location" value={profile.location} onChange={readOnly ? undefined : (value) => updateField('location', value)} readOnly={!!readOnly} />
                                {role === 'farmer' && (
                                    <Field label="Farm name" value={profile.farm_name} onChange={readOnly ? undefined : (value) => updateField('farm_name', value)} readOnly={!!readOnly} />
                                )}

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-500">Email</label>
                                    <input
                                        value={profile.email}
                                        readOnly
                                        className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none ring-0 ${theme.ring}`}
                                    />
                                </div>

                                {!readOnly && (
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className={`w-full rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-70 ${theme.button}`}
                                    >
                                        {saving ? 'Saving changes...' : 'Save changes'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </section>
            </div>
        </div>
    );
}

function Field({ label, value, onChange, readOnly }: { label: string; value: string; onChange?: (value: string) => void; readOnly?: boolean; }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-slate-500">{label}</label>
            <input
                value={value}
                onChange={onChange ? (event) => onChange(event.target.value) : undefined}
                readOnly={readOnly}
                className={`w-full rounded-xl border border-slate-200 px-4 py-3 ${readOnly ? 'bg-slate-50 text-slate-700' : 'bg-white text-slate-900'} outline-none transition focus:border-transparent focus:ring-2 focus:ring-green-500`}
            />
        </div>
    );
}

function DetailItem({ label, value }: { label: string; value: string; }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-sm font-medium text-slate-900 break-words">{value}</p>
        </div>
    );
}

function getProfileStorageError(message: string) {
    if (message.toLowerCase().includes('bucket not found')) {
        return 'Supabase storage bucket profile-media is missing. Create it and apply the storage SQL before trying again.';
    }

    return message;
}