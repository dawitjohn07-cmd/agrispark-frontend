'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { syncUserProfile, validateEmail } from '@/lib/utils';

const mapAuthError = (message: string) => {
    const lower = String(message || '').toLowerCase();

    if (lower.includes('email not confirmed')) {
        return 'Your email is not confirmed yet. Either confirm your email or disable Confirm email in Supabase Auth settings for development.';
    }

    if (lower.includes('invalid login credentials') || lower.includes('email not registered')) {
        return 'Invalid email or password. If you just signed up, verify email confirmation settings in Supabase.';
    }

    if (lower.includes('user already registered')) {
        return 'This email is already registered. Please sign in instead.';
    }

    return message || 'Authentication error occurred.';
};

export default function LoginRegister() {
    const router = useRouter();
    const [mode, setMode] = useState('login');
    const [role, setRole] = useState('farmer');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [notice, setNotice] = useState('');

    // Form fields
    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [registerEmail, setRegisterEmail] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [location, setLocation] = useState('');
    const [loginIdentifier, setLoginIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    const ensureFreshAuthState = async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const hasSession = !!sessionData?.session;

        if (!hasSession) return;

        const { data: authUserData, error: authUserError } = await supabase.auth.getUser();

        if (authUserError || !authUserData?.user) {
            await supabase.auth.signOut();
        }
    };

    useEffect(() => {
        ensureFreshAuthState();

        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('reason') === 'deactivated') {
                setNotice('Your account has been deactivated. Please contact support.');
            }
        }
    }, []);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!fullName.trim() || !registerEmail.trim() || !password) {
            setError('Please fill in all required fields');
            return;
        }

        if (!agreedToTerms) {
            setError('You must agree to the Terms and Conditions to register');
            return;
        }

        if (!validateEmail(registerEmail)) {
            setError('Invalid email address');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        const normalizedEmail = registerEmail.trim().toLowerCase();

        setIsSubmitting(true);

        try {
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: normalizedEmail,
                password: password,
                options: {
                    data: {
                        full_name: fullName,
                        role: role,
                        phone_number: phoneNumber,
                        farm_name: businessName,
                        location: location,
                    },
                },
            });

            if (signUpError) throw signUpError;

            if (authData?.user) {
                try {
                    await syncUserProfile({
                        id: authData.user.id,
                        email: authData.user.email,
                        user_metadata: {
                            full_name: fullName,
                            role: role,
                            phone_number: phoneNumber,
                            farm_name: businessName,
                            location: location,
                        },
                    });
                } catch (profileErr: any) {
                    console.warn('Profile sync warning:', profileErr?.message || profileErr);
                }

                if (!authData.session) {
                    try {
                        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
                            email: normalizedEmail,
                            password: password,
                        });

                        if (!signInErr && signInData?.user) {
                            setSuccess('Registration successful and signed in. Redirecting...');
                            const { data: userRow } = await supabase
                                .from('users')
                                .select('role')
                                .eq('id', signInData.user.id)
                                .maybeSingle();

                            const userRole = userRow?.role || 'buyer';
                            setTimeout(() => {
                                if (userRole === 'admin') router.push('/admin');
                                else if (userRole === 'farmer') router.push('/farmer');
                                else router.push('/buyer');
                            }, 800);
                        } else {
                            setSuccess('Registration successful. Check your inbox to confirm email before login (or disable Confirm email in Supabase for development).');
                        }
                    } catch (_err) {
                        setSuccess('Registration successful. Check your inbox to confirm email before login (or disable Confirm email in Supabase for development).');
                    }
                } else {
                    setSuccess('Registration successful! You can sign in now.');
                }
                setTimeout(() => {
                    setMode('login');
                }, 2000);
            }
        } catch (err: any) {
            setError(mapAuthError(err?.message || 'Registration failed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!loginIdentifier.trim() || !password) {
            setError('Please enter email and password');
            return;
        }

        const normalizedEmail = loginIdentifier.trim().toLowerCase();

        setIsSubmitting(true);

        try {
            const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password: password,
            });

            if (loginError) throw loginError;

            if (authData?.user) {
                const { data: userRow } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', authData.user.id)
                    .maybeSingle();

                const userRole = userRow?.role || 'buyer';

                if (userRole === 'admin') {
                    router.push('/admin');
                } else if (userRole === 'farmer') {
                    router.push('/farmer');
                } else {
                    router.push('/buyer');
                }
            }
        } catch (err: any) {
            console.error('Login error', err);
            const msg = err?.message || (err && typeof err === 'object' ? JSON.stringify(err) : 'Login failed');
            setError(mapAuthError(msg));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
            <Link
                href="/"
                className="absolute left-4 top-4 text-farmer-green font-semibold flex items-center gap-2"
            >
                <span aria-hidden="true">←</span>
                <span>Back</span>
            </Link>
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg">
                <div className="bg-gradient-to-r from-farmer-green to-buyer-blue text-white p-8 text-center rounded-t-2xl">
                    <h1 className="text-3xl font-bold">AgriSpark</h1>
                    <p className="text-green-100 mt-2">Connect Farmers & Buyers</p>
                </div>

                <div className="p-8">
                    <div className="flex gap-4 mb-8">
                        <button
                            onClick={() => setMode('login')}
                            className={`flex-1 py-2 rounded-lg font-semibold transition-all ${mode === 'login'
                                ? 'bg-farmer-green text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => setMode('register')}
                            className={`flex-1 py-2 rounded-lg font-semibold transition-all ${mode === 'register'
                                ? 'bg-farmer-green text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Register
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                            {success}
                        </div>
                    )}
                    {notice && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                            {notice}
                        </div>
                    )}

                    {mode === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={loginIdentifier}
                                    onChange={(e) => setLoginIdentifier(e.target.value)}
                                    placeholder="your@email.com"
                                    className="input-field border-farmer-green focus:ring-farmer-green"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="input-field border-farmer-green focus:ring-farmer-green"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3 text-gray-500"
                                    >
                                        {showPassword ? '👁️' : '👁️‍🗨️'}
                                    </button>
                                </div>
                            </div>

                            <Link href="/reset-password" className="text-sm text-farmer-green hover:underline">
                                Forgot password?
                            </Link>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full btn-primary btn-primary-farmer disabled:opacity-50"
                            >
                                {isSubmitting ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>
                    )}

                    {mode === 'register' && (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">I am a:</label>
                                <div className="flex gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="role"
                                            value="farmer"
                                            checked={role === 'farmer'}
                                            onChange={(e) => setRole(e.target.value)}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm">Farmer</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="role"
                                            value="buyer"
                                            checked={role === 'buyer'}
                                            onChange={(e) => setRole(e.target.value)}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm">Buyer</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="John Doe"
                                    className="input-field"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                                <input
                                    type="email"
                                    value={registerEmail}
                                    onChange={(e) => setRegisterEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="input-field"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="123-456-7890"
                                    className="input-field"
                                />
                            </div>

                            {role === 'farmer' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Farm/Business Name</label>
                                    <input
                                        type="text"
                                        value={businessName}
                                        onChange={(e) => setBusinessName(e.target.value)}
                                        placeholder="Green Acres Farm"
                                        className="input-field"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="City, Region"
                                    className="input-field"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="input-field"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3 text-gray-500"
                                    >
                                        {showPassword ? '👁️' : '👁️‍🗨️'}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="input-field"
                                />
                            </div>

                            <div className="mt-6 border rounded-lg p-4 bg-gray-50 border-gray-200">
                                <h3 className="font-bold text-sm mb-2 text-gray-800">✅ AGRISPARK PLATFORM TERMS & USER AGREEMENT</h3>
                                <p className="text-xs text-gray-500 mb-4">Last Updated: June 2026 | Jurisdiction: Federal Democratic Republic of Ethiopia</p>
                                
                                <div className="h-48 overflow-y-auto text-xs text-gray-700 space-y-4 pr-2 bg-white p-3 rounded border">
                                    <div>
                                        <h4 className="font-bold">☑️ 1. ACCOUNT REGISTRATION AGREEMENT</h4>
                                        <p className="mt-1">By creating an AgriSpark account, you confirm that you are providing accurate and verifiable information. You agree to be assigned a role as either Buyer (Individual/Institutional) or Seller (Farmer/Cooperative). Institutional buyers must provide valid business or trade documentation. Seller accounts may be subject to verification before activation. You understand that verified status may be granted or revoked by administrators, and accounts may be suspended for misuse, fraud, or policy violations.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold">☑️ 2. TRANSACTIONS & PAYMENT RULES</h4>
                                        <p className="mt-1">All payments are processed through AgriSpark-approved systems (PayPal or CBE transfer verification). Cash payments outside the platform are not allowed for order confirmation. Orders may remain in Pending Verification until payment is confirmed. Funds may be held temporarily in escrow, and orders are only activated after successful payment verification.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold">☑️ 3. PLATFORM FEES & COMMISSIONS</h4>
                                        <p className="mt-1">A platform commission is automatically deducted from completed transactions. The commission rate is defined by AgriSpark (currently 3% unless updated). Remaining payments are transferred to sellers after order completion.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold">☑️ 4. DELIVERY & LOGISTICS AGREEMENT</h4>
                                        <p className="mt-1">Delivery logistics are handled outside direct platform payment systems. Delivery fees may be agreed between buyer, seller, or third-party transport providers. Sellers must update order status when goods leave the farm (In Transit).</p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold">☑️ 5. DELIVERY STATUS & ORDER TRACKING</h4>
                                        <p className="mt-1">Orders will include a Delivery Status field for tracking progress (Pending, Picked Up, In Transit, Delivered). Delivery status is separate from payment/order status and is used only for logistics transparency.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold">☑️ 6. DISPUTES & REFUND POLICY</h4>
                                        <p className="mt-1">Buyers have a 7-day inspection period after delivery. Disputes must be submitted before the inspection period ends. Evidence (images/videos) may be required. AgriSpark admins make final decisions on disputes, which may result in full, partial, or no refund.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold">☑️ 7. PRIVACY & DATA USE</h4>
                                        <p className="mt-1">Your personal data is protected under Ethiopian Electronic Transactions law. Sensitive information is restricted and not publicly accessible. Only necessary data is shared between verified parties during transactions. Platform administrators may access data only for verification and dispute resolution. Data misuse or scraping is strictly prohibited.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold">☑️ 8. MARKET RULES & FAIR USE</h4>
                                        <p className="mt-1">Prices are controlled by sellers, not the platform. The platform does not manipulate product pricing. Listings may be updated or removed by sellers if no active orders exist.</p>
                                    </div>
                                </div>

                                <div className="mt-4 space-y-2">
                                    <label className="flex items-start gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={agreedToTerms}
                                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                                            className="mt-1 w-4 h-4 text-farmer-green focus:ring-farmer-green border-gray-300 rounded"
                                        />
                                        <div className="text-xs text-gray-700 leading-tight">
                                            I have read and understood the AgriSpark Terms & Platform Policies. I agree to follow all rules and transaction policies and understand that violation may result in account suspension.
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !agreedToTerms}
                                className="w-full btn-primary btn-primary-farmer disabled:opacity-50"
                            >
                                {isSubmitting ? 'Creating account...' : 'Accept & Register'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
