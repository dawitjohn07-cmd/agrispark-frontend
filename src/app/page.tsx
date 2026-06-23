'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import PublicNavbar from '@/components/PublicNavbar';

export default function Home() {
    const router = useRouter();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ farmers: 0, buyers: 0, transactions: 0 });

    useEffect(() => {
        let cancelled = false;
        const timeout = setTimeout(() => {
            if (!cancelled) setLoading(false);
        }, 3000);

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (cancelled) return;
            clearTimeout(timeout);
            setSession(session as any);
            setLoading(false);

            // Auto redirect if already logged in based on role
            if (session) {
                const fetchRole = async () => {
                    const { data } = await supabase
                        .from('users')
                        .select('role')
                        .eq('id', session.user.id)
                        .single();

                    const role = data?.role || 'buyer';
                    if (role === 'farmer') {
                        router.push('/farmer');
                    } else if (role === 'admin') {
                        router.push('/admin');
                    } else {
                        router.push('/buyer');
                    }
                };
                fetchRole();
            }
        }).catch((e) => {
            clearTimeout(timeout);
            setLoading(false);
        });

        return () => { cancelled = true; clearTimeout(timeout); };
    }, [router]);

    useEffect(() => {
        let cancelled = false;

        const loadStats = async () => {
            try {
                const [farmersResult, buyersResult, transactionsResult] = await Promise.all([
                    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'farmer').eq('is_active', true),
                    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'buyer').eq('is_active', true),
                    supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['confirmed', 'delivered']),
                ]);

                if (cancelled) return;

                setStats({
                    farmers: farmersResult.count || 0,
                    buyers: buyersResult.count || 0,
                    transactions: transactionsResult.count || 0,
                });
            } catch (error) {
                if (!cancelled) {
                    setStats({ farmers: 0, buyers: 0, transactions: 0 });
                }
            }
        };

        loadStats();

        return () => {
            cancelled = true;
        };
    }, []);

    if (session) return null; // Will redirect

    return (
        <div className="min-h-screen bg-white text-[#0f172a]">
            {/* Navigation */}
            <PublicNavbar />

            {/* Hero */}
            <section className="w-full bg-gradient-to-br from-green-50 to-white">
                <div className="grid w-full gap-8 px-4 py-16 sm:px-6 md:grid-cols-2 lg:px-12 lg:py-20">
                    <div>
                        <div className="inline-flex items-center rounded-full bg-[#e6f4ea] px-3 py-1 text-xs font-medium text-[#16a34a] mb-4 sm:text-sm">Connecting Farms to Markets</div>
                        <h1 className="text-3xl font-extrabold leading-tight text-[#0f172a] sm:text-4xl md:text-5xl">
                            Direct Connection Between
                            <br />
                            <span className="text-[#16a34a]">Farmers & Buyers</span>
                        </h1>
                        <p className="mt-4 max-w-xl text-sm leading-7 text-gray-700 sm:text-base sm:leading-8">AgriSpark eliminates middlemen and enables direct transactions between farmers and bulk buyers, ensuring fair pricing and fresh produce.</p>

                        <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                            <Link href="/login" className="px-5 py-3 bg-[#16a34a] text-white rounded-md font-semibold">Get Started →</Link>
                            <Link href="/products" className="px-5 py-3 bg-white border border-[#16a34a] text-[#16a34a] rounded-md font-semibold">Browse Products</Link>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-2 sm:gap-3">
                            {['No Middlemen', 'Fair Pricing', 'Fresh Produce', 'Secure Payments'].map((b) => (
                                <div key={b} className="rounded-full bg-[#f0fbf5] px-3 py-1 text-xs font-medium text-[#16a34a] sm:text-sm">{b}</div>
                            ))}
                        </div>
                    </div>

                    <div className="relative min-h-[18rem] overflow-hidden rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-100 via-green-50 to-white shadow md:min-h-[24rem]">
                        <img
                            src="/images/home-hero-bg.png"
                            alt="Farmers with produce"
                            onError={() => { }}
                            className="absolute inset-0 h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-br from-[#16a34a]/10 via-transparent to-white/30" />
                    </div>
                </div>
            </section>

            {/* About removed from home page - moved to /about */}

            {/* Stats */}
            <section className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 gap-6 text-center sm:grid-cols-3">
                    <div className="bg-white border rounded-xl p-6 shadow-sm">
                        <div className="text-2xl font-bold text-[#16a34a]">{stats.farmers}</div>
                        <div className="text-sm text-gray-600">Active Farmers</div>
                    </div>
                    <div className="bg-white border rounded-xl p-6 shadow-sm">
                        <div className="text-2xl font-bold text-[#16a34a]">{stats.buyers}</div>
                        <div className="text-sm text-gray-600">Verified Buyers</div>
                    </div>
                    <div className="bg-white border rounded-xl p-6 shadow-sm">
                        <div className="text-2xl font-bold text-[#16a34a]">{stats.transactions}</div>
                        <div className="text-sm text-gray-600">Transactions</div>
                    </div>
                </div>
            </section>

            {/* Why Choose */}
            <section className="max-w-7xl mx-auto px-6 py-16">
                <h2 className="text-3xl font-bold mb-4">Why Choose AgriSpark?</h2>
                <p className="text-gray-600 mb-8">Built for Farmers. Designed for Growth.</p>

                <div className="grid md:grid-cols-4 gap-6">
                    {[
                        { icon: '🌐', title: 'Direct Market Access', desc: 'Reach buyers beyond your local market.' },
                        { icon: '📈', title: 'Better Earnings', desc: 'Keep more of your margin by removing middlemen.' },
                        { icon: '🌱', title: 'Grow Your Business', desc: 'Tools and guidance to scale farm operations.' },
                        { icon: '🤝', title: 'Reliable Support', desc: 'Assistance to help you succeed on the platform.' },
                    ].map((c) => (
                        <div key={c.title} className="bg-white border rounded-lg p-6 shadow-sm">
                            <div className="text-3xl mb-3">{c.icon}</div>
                            <h4 className="text-lg font-semibold mb-1">{c.title}</h4>
                            <p className="text-gray-600">{c.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <footer className="bg-white border-t py-8 mt-12">
                <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-600">© {new Date().getFullYear()} AgriSpark. Connecting farmers and buyers for direct commerce.</div>
            </footer>
        </div>
    );
}
