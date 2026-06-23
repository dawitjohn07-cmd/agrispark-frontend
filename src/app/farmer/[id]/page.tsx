import PublicFarmerProfile from '@/components/PublicFarmerProfile';

export default function PublicFarmerProfilePage({ params }: { params: { id: string } }) {
    const id = params.id;
    return <PublicFarmerProfile farmerId={id} />;
}
