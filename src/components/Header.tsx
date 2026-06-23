'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

interface HeaderProps {
    role?: 'farmer' | 'buyer';
    userName?: string;
}

export default function Header({ role = 'farmer', userName }: HeaderProps) {
    const router = useRouter();
    const [isLightMode, setIsLightMode] = useState(false);

    useEffect(() => {
        const read = () => {
            try {
                const stored = window.localStorage.getItem('agri-auth-theme');
                setIsLightMode(stored === 'light');
            } catch (e) {
                // ignore
            }
        };

        read();
        const onStorage = (e: StorageEvent) => {
            if (e.key === 'agri-auth-theme') read();
        };

        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <header className="sticky top-0 z-50 border-b border-[#16a34a] bg-[#16a34a] text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
                <Link href={role === 'farmer' ? '/farmer' : '/buyer'} className="text-2xl font-bold text-white agri-header-logo">
                    AgriSpark
                </Link>

                <div className="hidden md:flex items-center gap-4">
                    <span className="text-sm text-white/90 agri-header-welcome">Welcome, {userName || 'User'}</span>
                    <button
                        onClick={handleLogout}
                        className="agri-header-logout rounded-xl border border-white/30 px-4 py-2 font-bold transition"
                    >
                        Logout
                    </button>
                </div>
            </nav>
        </header>
    );
}