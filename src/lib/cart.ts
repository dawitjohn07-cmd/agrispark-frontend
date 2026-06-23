export const CART_STORAGE_KEY = 'buyer_cart_items';
export const CART_UPDATED_EVENT = 'agri-cart-updated';

export interface CartProduct {
    id: string;
    name: string;
    category: string;
    quantity: number;
    price: number;
    location: string;
    image_url: string;
    resolved_image_url: string;
    farmer_id: string;
    pricing_type?: string;
}

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const notifyCartUpdated = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(CART_UPDATED_EVENT));
    }
};

export const getCartItems = (): CartProduct[] => {
    if (!canUseStorage()) return [];

    try {
        const raw = window.localStorage.getItem(CART_STORAGE_KEY);
        if (!raw) return [];

        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as CartProduct[]) : [];
    } catch {
        return [];
    }
};

export const saveCartItems = (items: CartProduct[]) => {
    if (!canUseStorage()) return;

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    notifyCartUpdated();
};

export const addToCart = (product: CartProduct) => {
    const currentItems = getCartItems();
    if (currentItems.some((item) => item.id === product.id)) return;

    saveCartItems([...currentItems, product]);
};

export const removeFromCart = (productId: string) => {
    const currentItems = getCartItems();
    saveCartItems(currentItems.filter((item) => item.id !== productId));
};

export const isInCart = (productId: string): boolean => {
    return getCartItems().some((item) => item.id === productId);
};

export const getCartCount = (): number => getCartItems().length;
