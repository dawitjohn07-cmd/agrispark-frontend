/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                "farmer-green": "#0F9D58",
                "farmer-light": "#E8F5E9",
                "buyer-blue": "#0E698C",
                "buyer-light": "#E8F3F8",
                "accent-gold": "#F59E0B",
            },
        },
    },
    plugins: [],
};
