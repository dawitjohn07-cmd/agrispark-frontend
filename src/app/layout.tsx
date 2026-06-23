import '../styles/globals.css';
import ClientAuth from '@/components/ClientAuth';
import AppShell from '@/components/AppShell';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>AgriSpark - Connect Farmers & Buyers</title>
                <meta name="description" content="AgriSpark: Direct produce transactions between farmers and bulk buyers" />
            </head>
            <body className="bg-gray-50 text-gray-900">
                <ClientAuth />
                <AppShell>{children}</AppShell>
            </body>
        </html>
    );
}
