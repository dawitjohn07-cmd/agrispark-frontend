'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ClientAuth() {
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(true);
    const publicRoutes = ['/', '/login', '/reset-password', '/reset-password-confirm', '/products', '/about'];
    const isFarmerPublicView = !!pathname && /^\/farmer\/[^/]+\/view/.test(pathname);
    const isPublic = publicRoutes.includes(pathname) || isFarmerPublicView;

    useEffect(() => {
        if (isPublic) {
            setLoading(false);
            return;
        }

        const check = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (!session && !isPublic) {
                    router.push('/login');
                    return;
                }

                if (session) {
                    // fetch role
                    const { data: user } = await supabase.from('users').select('role, is_active').eq('id', session.user.id).single();
                    const role = user?.role || 'buyer';

                    if (user?.is_active === false) {
                        await supabase.auth.signOut();
                        router.replace('/login?reason=deactivated');
                        return;
                    }

                    if (role === 'admin') {
                        if (!pathname.startsWith('/admin')) {
                            router.replace('/admin');
                        }
                        return;
                    }

                    if (pathname.startsWith('/farmer') && !isFarmerPublicView && role !== 'farmer') return router.push('/buyer');
                    if (pathname.startsWith('/buyer') && role !== 'buyer') return router.push('/farmer');
                    if (pathname.startsWith('/admin') && role !== 'admin') return router.push('/login');
                }
            } catch (err) {
                console.error('ClientAuth error', err);
            } finally {
                setLoading(false);
            }
        };

        check();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session && !isPublic) router.push('/login');
        });

        return () => subscription?.unsubscribe();
    }, [isPublic, router]);

    if (isPublic) {
        return null;
    }

    if (loading) {
        return (
            <div className="w-full h-24 flex items-center justify-center">
                <div className="loader ease-linear rounded-full border-4 border-t-4 border-farmer-green h-8 w-8 mx-auto" />
            </div>
        );
    }

    return null;
}
