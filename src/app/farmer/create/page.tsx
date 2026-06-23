'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProduct, getMyProfile } from '@/lib/api';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabaseClient';
import { PRODUCT_IMAGES_BUCKET } from '@/lib/utils';

export default function FarmerCreateProduct() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        category: '',
        quantity: '',
        price: '',
        pricing_type: 'per_unit',
        description: '',
        image_url: '',
    });

    useEffect(() => {
        const fetchProfile = async () => {
            const userRow = await getMyProfile();
            if (userRow) {
                setProfile(userRow);
            }
        };

        fetchProfile();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!formData.name || !formData.category || !formData.quantity || !formData.price) {
            setError('Please fill in all required fields');
            return;
        }

        const priceNumber = parseFloat(formData.price);
        if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
            setError('Price must be greater than 0');
            return;
        }

        if (!formData.pricing_type) {
            setError('Please select a pricing type');
            return;
        }

        setLoading(true);

        try {
            await createProduct({
                name: formData.name,
                category: formData.category,
                quantity: parseInt(formData.quantity),
                price: parseFloat(formData.price),
                pricing_type: formData.pricing_type || 'per_unit',
                description: formData.description,
                image_url: formData.image_url,
                location: profile?.location || 'Not specified', // Use location from profile
            });

            setSuccess('Product created successfully!');
            setTimeout(() => {
                router.push('/farmer/products');
            }, 1500);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
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
            
            setFormData(prev => ({ ...prev, image_url: publicUrl }));
            setSuccess('Image uploaded successfully');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to upload image');
        } finally {
            setUploadingImage(false);
        }
    };

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

            <main className="max-w-2xl mx-auto px-4 py-6">
                <h1 className="text-3xl font-bold mb-6">Create New Product</h1>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 shadow">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="input-field"
                                placeholder="e.g., Wheat"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="input-field"
                            >
                                <option value="">Select Category</option>
                                <option value="Cereals">Cereals</option>
                                <option value="Vegetables">Vegetables</option>
                                <option value="Fruits">Fruits</option>
                                <option value="Legumes">Legumes</option>
                                <option value="Dairy">Dairy</option>
                                <option value="Livestock">Livestock</option>
                                <option value="Animals">Animals</option>
                                <option value="Animal Products">Animal Products</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                                <input
                                    type="number"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                    className="input-field"
                                    placeholder="0"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {formData.pricing_type === 'per_kg' ? 'Price (ETB/kg) *' : 'Price (ETB per item) *'}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    className="input-field"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="input-field"
                                placeholder="Describe your product..."
                                rows={4}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Image URL or Upload File</label>
                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                <div className="flex-1 w-full sm:w-auto">
                                    <input
                                        type="text"
                                        value={formData.image_url}
                                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                        className="input-field"
                                        placeholder="https://example.com/image.jpg"
                                    />
                                    <div className="text-xs text-gray-500 mt-1">Provide an image URL</div>
                                </div>
                                <div className="text-gray-400 font-medium text-sm px-2">OR</div>
                                <div className="flex-1 relative w-full sm:w-auto">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        disabled={uploadingImage}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                    />
                                    <div className={`input-field flex items-center justify-center bg-gray-50 border-dashed border-2 ${uploadingImage ? 'opacity-50' : 'hover:bg-gray-100'}`}>
                                        <span className="text-gray-600 text-sm font-medium">{uploadingImage ? 'Uploading...' : 'Browse file...'}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">Upload from your device</div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pricing type *</label>
                            <select
                                value={formData.pricing_type}
                                onChange={(e) => setFormData({ ...formData, pricing_type: e.target.value })}
                                className="input-field"
                            >
                                <option value="per_unit">Price per unit</option>
                                <option value="per_kg">Price per KG</option>
                            </select>
                        </div>

                        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                            <strong>Note:</strong> The platform will deduct a 10% commission from the total order amount.
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 btn-primary btn-primary-farmer disabled:opacity-50"
                            >
                                {loading ? 'Creating...' : 'Create Product'}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="flex-1 btn-primary bg-gray-500 text-white"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
}
