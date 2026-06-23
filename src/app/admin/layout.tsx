'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AdminLayout({ children }: { children: React.ReactNode; }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        let mounted = true;

        const checkAdmin = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    router.replace('/login');
                    return;
                }

                const { data: userRow } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .maybeSingle();

                if (userRow?.role !== 'admin') {
                    router.replace('/login');
                    return;
                }

                if (mounted) setAllowed(true);
            } catch (_err) {
                router.replace('/login');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        checkAdmin();

        return () => {
            mounted = false;
        };
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-600">Checking admin access...</p>
            </div>
        );
    }

    if (!allowed) return null;

    return <>{children}</>;
}
