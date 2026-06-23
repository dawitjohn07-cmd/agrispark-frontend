'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import PublicNavbar from '@/components/PublicNavbar';

export default function AboutPage() {
    const [stats, setStats] = useState({ farmers: 0, buyers: 0, products: 0, orders: 0 });

    useEffect(() => {
        let cancelled = false;

        const loadStats = async () => {
            try {
                const [farmersResult, buyersResult, productsResult, ordersResult] = await Promise.all([
                    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'farmer').eq('is_active', true),
                    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'buyer').eq('is_active', true),
                    supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_deleted', false).eq('is_under_review', false),
                    supabase.from('orders').select('*', { count: 'exact', head: true }),
                ]);

                if (cancelled) return;

                setStats({
                    farmers: farmersResult.count || 0,
                    buyers: buyersResult.count || 0,
                    products: productsResult.count || 0,
                    orders: ordersResult.count || 0,
                });
            } catch {
                if (!cancelled) {
                    setStats({ farmers: 0, buyers: 0, products: 0, orders: 0 });
                }
            }
        };

        loadStats();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="min-h-screen bg-white text-[#0f172a]">
            <PublicNavbar />

            <main>
                <section className="w-full bg-gradient-to-br from-green-50 to-white">
                    <div className="grid w-full gap-10 px-4 pt-4 pb-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-12 lg:pt-6 lg:pb-24">
                        <div>
                            <div className="inline-flex items-center rounded-full bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#16a34a] shadow-sm ring-1 ring-emerald-100">
                                ABOUT US
                            </div>
                            <h1 className="mt-5 max-w-2xl text-3xl font-black tracking-tight text-[#0f172a] sm:text-4xl md:text-5xl lg:text-6xl">
                                Connecting Ethiopian Farmers Directly to Buyers
                            </h1>
                            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-700 sm:text-base sm:leading-8 lg:text-lg">
                                AgriSpark is an agricultural marketplace platform built to eliminate middlemen, ensure fair pricing, and create a transparent
                                trading environment for farmers and buyers across Ethiopia.
                            </p>

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                                <Link
                                    href="/products"
                                    className="inline-flex items-center justify-center rounded-md bg-[#16a34a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#15803d]"
                                >
                                    Browse Products
                                </Link>
                                <Link
                                    href="/login"
                                    className="inline-flex items-center justify-center rounded-md border border-[#16a34a] bg-white px-5 py-3 text-sm font-semibold text-[#16a34a] transition hover:bg-green-50"
                                >
                                    Join as Farmer
                                </Link>
                            </div>
                        </div>

                        <div className="relative min-h-[22rem] overflow-hidden rounded-[1.5rem] border border-emerald-100 bg-gradient-to-br from-emerald-100 via-green-50 to-white shadow-xl lg:min-h-[30rem]">
                            <img
                                src="/images/hero-farmer.png"
                                alt="Ethiopian farmers"
                                onError={(e: any) => {
                                    // fallback to home hero if named file is missing or invalid
                                    try { e.currentTarget.src = '/images/home-hero-bg.png'; } catch { };
                                }}
                                className="absolute inset-0 h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-br from-[#16a34a]/10 via-transparent to-white/30" />
                        </div>
                    </div>
                </section>

                <section className="w-full bg-white">
                    <div className="w-full px-4 py-16 sm:px-6 lg:px-12 lg:py-20">
                        <div className="max-w-3xl">
                            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#16a34a]">OUR MISSION</p>
                            <h2 className="mt-4 text-2xl font-black tracking-tight text-[#0f172a] sm:text-3xl md:text-4xl">
                                Making Farm Commerce Simple, Fair, and Profitable
                            </h2>
                        </div>

                        <div className="mt-10 grid gap-6 md:grid-cols-3">
                            {[
                                {
                                    icon: '🌱',
                                    title: 'Direct Trade',
                                    desc: 'Farmers and buyers connect without extra layers, keeping prices fair and communication direct.',
                                },
                                {
                                    icon: '⚖️',
                                    title: 'Fair Pricing',
                                    desc: 'Transparent listings and open negotiations ensure both farmers and buyers get the value they deserve.',
                                },
                                {
                                    icon: '📈',
                                    title: 'Growth Focused',
                                    desc: 'Tools for listing products, managing orders, and communicating in real time support long-term business growth for every farmer.',
                                },
                            ].map((item) => (
                                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                                    <div className="text-3xl text-[#16a34a]">{item.icon}</div>
                                    <h3 className="mt-4 text-lg font-bold text-[#0f172a]">{item.title}</h3>
                                    <p className="mt-3 text-sm leading-7 text-slate-700">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="w-full bg-[#f8fafc]">
                    <div className="w-full px-4 py-16 sm:px-6 lg:px-12 lg:py-20">
                        <div className="max-w-3xl">
                            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#16a34a]">HOW IT WORKS</p>
                            <h2 className="mt-4 text-2xl font-black tracking-tight text-[#0f172a] sm:text-3xl md:text-4xl">Three Simple Steps to Get Started</h2>
                        </div>

                        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {[
                                {
                                    step: '01',
                                    title: 'Create Your Account',
                                    desc: 'Sign up as a farmer to list your products or as a buyer to browse fresh produce from verified farmers across Ethiopia.',
                                },
                                {
                                    step: '02',
                                    title: 'List or Browse Products',
                                    desc: 'Farmers upload their products with photos, pricing, and stock details. Buyers search by category, location, and price.',
                                },
                                {
                                    step: '03',
                                    title: 'Order, Pay, and Chat',
                                    desc: 'Buyers place orders and pay securely. Both sides communicate in real time through the built-in chat system tied to each order.',
                                },
                            ].map((item) => (
                                <div key={item.step} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#16a34a] text-sm font-black text-white">
                                        {item.step}
                                    </div>
                                    <h3 className="mt-5 text-lg font-bold text-[#0f172a]">{item.title}</h3>
                                    <p className="mt-3 text-sm leading-7 text-slate-700">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="w-full bg-[#16a34a]">
                    <div className="w-full px-4 py-16 sm:px-6 lg:px-12 lg:py-20">
                        <div className="max-w-3xl">
                            <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/80">STATISTICS</p>
                            <h2 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl md:text-4xl">Real Numbers From the Platform</h2>
                        </div>

                        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {[
                                { label: 'Total Farmers', value: stats.farmers },
                                { label: 'Total Buyers', value: stats.buyers },
                                { label: 'Total Products', value: stats.products },
                                { label: 'Total Orders', value: stats.orders },
                            ].map((item) => (
                                <div key={item.label} className="rounded-xl border border-white/20 bg-white/10 p-6 text-center shadow-sm backdrop-blur-sm">
                                    <div className="text-4xl font-black text-white">{item.value}</div>
                                    <div className="mt-2 text-sm font-medium text-white/90">{item.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="w-full bg-white">
                    <div className="w-full px-4 py-16 sm:px-6 lg:px-12 lg:py-20">
                        <div className="max-w-3xl">
                            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#16a34a]">WHY AGRISPARK</p>
                            <h2 className="mt-4 text-2xl font-black tracking-tight text-[#0f172a] sm:text-3xl md:text-4xl">Built for Ethiopian Agriculture</h2>
                        </div>

                        <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:items-center">
                            <div className="relative min-h-[22rem] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-emerald-100 via-green-50 to-white shadow-lg lg:min-h-[30rem]">
                                <img
                                    src="/images/about-produce.png"
                                    alt="Fresh produce"
                                    onError={(e: any) => {
                                        try { e.currentTarget.src = '/images/home-hero-bg.png'; } catch { };
                                    }}
                                    className="absolute inset-0 h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-br from-[#16a34a]/10 via-transparent to-white/30" />
                            </div>

                            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                                {[
                                    'Location-based product filtering to find farmers near you',
                                    'Real-time chat between buyers and farmers on every order',
                                    'Secure PayPal and CBE bank transfer payment options',
                                    'Admin-controlled dispute resolution with refund processing',
                                    'Farmer ratings and reviews to build trust and accountability',
                                ].map((item) => (
                                    <div key={item} className="flex items-start gap-3">
                                        <div className="mt-1 text-[#16a34a]">✓</div>
                                        <p className="text-sm leading-7 text-slate-700">{item}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="w-full bg-[#f0fdf4]">
                    <div className="w-full px-4 py-16 sm:px-6 lg:px-12 lg:py-20">
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {[
                                {
                                    icon: '🔒',
                                    title: 'Secure Transactions',
                                    desc: 'All payments are processed through PayPal or verified CBE bank transfer. No sensitive payment data is stored on our servers.',
                                },
                                {
                                    icon: '⭐',
                                    title: 'Verified Ratings',
                                    desc: 'Every farmer rating comes from a real buyer who completed an order, ensuring honest and trustworthy feedback.',
                                },
                                {
                                    icon: '🛡️',
                                    title: 'Dispute Protection',
                                    desc: 'Our admin team reviews every dispute with evidence from both sides and processes refunds fairly within 3 days.',
                                },
                            ].map((item) => (
                                <div key={item.title} className="rounded-xl border border-emerald-100 bg-white p-6 shadow-sm">
                                    <div className="text-3xl text-[#16a34a]">{item.icon}</div>
                                    <h3 className="mt-4 text-lg font-bold text-[#0f172a]">{item.title}</h3>
                                    <p className="mt-3 text-sm leading-7 text-slate-700">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="w-full bg-[#16a34a]">
                    <div className="w-full px-4 py-16 text-center sm:px-6 lg:px-12 lg:py-20">
                        <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl md:text-4xl">Ready to Join AgriSpark?</h2>
                        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/90 sm:text-base sm:leading-8 lg:text-lg">
                            Whether you are a farmer with fresh produce or a buyer looking for quality products, AgriSpark is built for you.
                        </p>

                        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
                            <Link href="/login" className="rounded-md bg-white px-5 py-3 text-sm font-semibold text-[#16a34a] transition hover:bg-slate-100">
                                Sign Up Now
                            </Link>
                            <Link href="/products" className="rounded-md border border-white px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                                Browse Products
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="bg-white border-t py-8 mt-0">
                <div className="w-full text-center text-sm text-gray-600">
                    © {new Date().getFullYear()} AgriSpark. Connecting farmers and buyers for direct commerce.
                </div>
            </footer>
        </div>
    );
}