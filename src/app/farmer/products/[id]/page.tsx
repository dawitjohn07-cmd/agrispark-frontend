import ProductEditor from '@/components/ProductEditor';

export default function FarmerEditProductPage({ params }: { params: { id: string } }) {
    return <ProductEditor productId={params.id} />;
}
