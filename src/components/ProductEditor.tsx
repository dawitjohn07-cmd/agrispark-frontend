'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Header from '@/components/Header';
import { formatMoney, resolveImageUrl, PRODUCT_IMAGES_BUCKET } from '@/lib/utils';
import { categories } from '@/lib/categories';

interface ProductEditorProps {
    productId: string;
}

export default function ProductEditor({ productId }: ProductEditorProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [profile, setProfile] = useState<any>(null);
    const [product, setProduct] = useState<any>(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError('');

            try {
                const { data: authData } = await supabase.auth.getUser();
                const authUser = authData?.user;

                if (!authUser?.id) {
                    router.push('/login');
                    return;
                }

                const { data: userRow, error: userError } = await supabase
                    .from('users')
                    .select('id, full_name, role, location')
                    .eq('id', authUser.id)
                    .maybeSingle();

                if (userError) throw userError;
                if (!userRow || userRow.role !== 'farmer') {
                    throw new Error('Only farmer accounts can edit products.');
                }

                const { data: productRow, error: productError } = await supabase
                    .from('products')
                    .select('*')
                    .eq('id', productId)
                    .maybeSingle();

                if (productError) throw productError;
                if (!productRow) throw new Error('Product not found.');
                if (productRow.farmer_id !== userRow.id) throw new Error('You do not have permission to edit this product.');
                if (productRow.is_under_review === true) throw new Error('This product is under review and cannot be edited right now.');

                setProfile(userRow);
                setProduct(productRow);
                setPreviewUrl(resolveImageUrl(productRow.image_url || ''));
            } catch (err: any) {
                setError(err?.message || 'Could not load product.');
            } finally {
                setLoading(false);
            }
        };

        if (productId) load();
    }, [productId, router]);

    const updateField = (field: string, value: string) => {
        setProduct((current: any) => (current ? { ...current, [field]: value } : current));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        if (!product?.id) return;
        if (!profile?.id) {
            throw new Error('Farmer profile is unavailable.');
        }
        if (product?.is_under_review === true) {
            setError('This product is under review and cannot be edited right now.');
            return;
        }

        setSaving(true);

        try {
            const payload = {
                name: product.name?.trim(),
                category: product.category?.trim(),
                quantity: Number(product.quantity),
                price: Number(product.price),
                pricing_type: product.pricing_type || 'per_unit',
                description: product.description?.trim() || '',
                image_url: product.image_url?.trim() || '',
                location: product.location?.trim() || profile?.location || '',
            };

            if (!payload.name || !payload.category || !Number.isFinite(payload.quantity) || !Number.isFinite(payload.price)) {
                throw new Error('Please fill in the required fields.');
            }
            if (payload.price <= 0) throw new Error('Price must be greater than 0');
            if (!payload.pricing_type) throw new Error('Pricing type must be set');

            const { error: updateError } = await supabase
                .from('products')
                .update({ ...payload, is_deleted: false })
                .eq('id', product.id)
                .eq('farmer_id', profile.id);

            if (updateError) throw updateError;

            setSuccess('Product updated successfully.');
            setTimeout(() => {
                router.push('/farmer/products');
            }, 900);
        } catch (err: any) {
            setError(err?.message || 'Failed to update product.');
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        setError('');

        try {
            const ext = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
            const path = `uploads/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(PRODUCT_IMAGES_BUCKET)
                .upload(path, file);

            if (uploadError) throw uploadError;

            const publicUrl = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
            
            updateField('image_url', publicUrl);
            setPreviewUrl(publicUrl);
            setSuccess('Image uploaded successfully.');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to upload image.');
        } finally {
            setUploadingImage(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header role="farmer" userName={profile?.full_name} />
                <div className="flex items-center justify-center py-20">
                    <p className="text-gray-600">Loading product...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Header role="farmer" userName={profile?.full_name} />

            <main className="mx-auto max-w-4xl px-4 py-6">
                <button onClick={() => router.back()} className="mb-6 text-farmer-green hover:underline">
                    ← Back to products
                </button>

                <div className="rounded-2xl bg-white p-6 shadow-lg text-white">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">Edit Product</h1>
                            <p className="mt-1 text-sm text-slate-500">Update the existing listing and save the changes.</p>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                            {product?.category || 'Product'}
                        </span>
                    </div>

                    {error && (
                        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            {success}
                        </div>
                    )}
                    {product?.is_deleted && (
                        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            This product was removed by an administrator. You can edit and resubmit it to make it live again.
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
                        <div className="space-y-4">
                            <Field label="Product name *" value={product?.name || ''} onChange={(value) => updateField('name', value)} />
                            <div>
                                <label className="mb-2 block text-sm font-medium text-white">Category *</label>
                                <select
                                    value={product?.category || ''}
                                    onChange={(e) => updateField('category', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="">Select category</option>
                                    {categories
                                        .filter((c) => c.value !== 'All')
                                        .map((c) => (
                                            <option key={c.value} value={c.value}>
                                                {c.icon ? `${c.icon} ${c.label}` : c.label}
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Quantity *" type="number" value={String(product?.quantity ?? '')} onChange={(value) => updateField('quantity', value)} />
                                <Field label={product?.pricing_type === 'per_kg' ? 'Price (ETB/kg) *' : 'Price (ETB per item) *'} type="number" value={String(product?.price ?? '')} onChange={(value) => updateField('price', value)} />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-white">Pricing type *</label>
                                <select
                                    value={product?.pricing_type || 'per_unit'}
                                    onChange={(e) => updateField('pricing_type', e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="per_unit">Price per unit</option>
                                    <option value="per_kg">Price per KG</option>
                                </select>
                            </div>
                            <Field label="Location" value={product?.location || ''} onChange={(value) => updateField('location', value)} />
                            <div>
                                <label className="mb-2 block text-sm font-medium text-white">Description</label>
                                <textarea
                                    value={product?.description || ''}
                                    onChange={(event) => updateField('description', event.target.value)}
                                    rows={6}
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-medium text-white">Image URL or Upload File</label>
                                <div className="flex gap-4 items-center">
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={product?.image_url || ''}
                                            onChange={(e) => {
                                                updateField('image_url', e.target.value);
                                                setPreviewUrl(resolveImageUrl(e.target.value));
                                            }}
                                            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-emerald-500"
                                            placeholder="https://example.com/image.jpg"
                                        />
                                        <div className="text-xs text-emerald-100 mt-1">Provide an image URL</div>
                                    </div>
                                    <div className="text-emerald-100 font-medium text-sm px-2">OR</div>
                                    <div className="flex-1 relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            disabled={uploadingImage}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                        />
                                        <div className={`w-full rounded-xl border-dashed border-2 px-4 py-3 text-center transition ${uploadingImage ? 'opacity-50 border-slate-400 bg-white/10 text-white' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-900'}`}>
                                            <span className="text-sm font-medium">{uploadingImage ? 'Uploading...' : 'Browse file...'}</span>
                                        </div>
                                        <div className="text-xs text-emerald-100 mt-1">Upload from your device</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <aside className="space-y-4">
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                <div className="h-56 bg-slate-200">
                                    {previewUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={previewUrl} alt={product?.name || 'Product preview'} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-sm text-slate-500">No image preview</div>
                                    )}
                                </div>
                                <div className="p-4 text-sm text-slate-600">
                                    <p className="font-semibold text-slate-900">Preview</p>
                                    <p className="mt-1">{product?.name || 'Untitled product'}</p>
                                    <p className="mt-1">{
                                        product
                                            ? (product.pricing_type === 'per_kg' ? `${formatMoney(product.price)}/kg` : `${formatMoney(product.price)} per item`)
                                            : formatMoney(0)
                                    }</p>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
                                <p className="font-semibold text-slate-900">Saved by</p>
                                <p className="mt-1">{profile?.full_name || 'Farmer'}</p>
                                <p className="mt-1">{profile?.location || 'Location not shared'}</p>
                            </div>

                            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 shadow-sm">
                                <strong>Note:</strong> The platform will deduct a 10% commission from the total order amount.
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full rounded-xl bg-farmer-green px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {saving ? 'Saving changes...' : 'Save changes'}
                            </button>
                        </aside>
                    </form>
                </div>
            </main>
        </div>
    );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string; }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-white">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-emerald-500"
            />
        </div>
    );
}
