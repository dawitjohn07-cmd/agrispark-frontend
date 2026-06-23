import { supabase } from './supabaseClient';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL + '/api';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export async function apiRequest<T = any>(
  method: HttpMethod,
  endpoint: string,
  body?: Record<string, unknown> | null
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    const message = payload?.error || payload?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export interface CreateOrderPayload {
  product_id: string;
  quantity: number;
  payment_method?: 'PayPal' | 'Bank Transfer';
  transaction_reference?: string;
}

// Products
export const getProducts = (params?: { search?: string; category?: string; location?: string; mine?: boolean }) => {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.category && params.category !== 'All') query.set('category', params.category);
  if (params?.location && params.location !== 'All Locations') query.set('location', params.location);
  if (params?.mine) query.set('mine', 'true');
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<any[]>('GET', `/products${suffix}`);
};

export const getProductById = (id: string) => apiRequest<any>('GET', `/products/${id}`);
export const createProduct = (data: Record<string, unknown>) => apiRequest<any>('POST', '/products', data);
export const updateProduct = (id: string, data: Record<string, unknown>) => apiRequest<any>('PUT', `/products/${id}`, data);
export const deleteProduct = (id: string) => apiRequest<{ success: boolean }>('DELETE', `/products/${id}`);

// Orders
export const getOrders = () => apiRequest<any[]>('GET', '/orders');
export const getOrderById = (id: string) => apiRequest<any>('GET', `/orders/${id}`);
export const createOrder = (data: CreateOrderPayload) => apiRequest<any>('POST', '/orders', data as unknown as Record<string, unknown>);
export const updateOrder = (id: string, data: { status?: string; delivery_status?: string }) => apiRequest<any>('PUT', `/orders/${id}`, data);
export const deleteOrder = (id: string) => apiRequest<{ success: boolean }>('DELETE', `/orders/${id}`);

export const capturePaypalPayment = (data: { paypal_order_id: string }) => apiRequest<any>('POST', '/payments/paypal/capture', data);
export const verifyPaypalPayment = (data: { paypal_order_id: string; product_id: string; quantity: number }) => apiRequest<any>('POST', '/payments/paypal/verify', data);
export const refundPaypalPayment = (data: { capture_id: string; amount: number }) => apiRequest<any>('POST', '/payments/paypal/refund', data);
export const verifyCbePayment = (data: { product_id: string; quantity: number; transaction_reference: string }) => apiRequest<any>('POST', '/payments/cbe', data);

// Users
export const getMyProfile = () => apiRequest<any>('GET', '/users/profile');
export const updateMyProfile = (data: Record<string, unknown>) => apiRequest<any>('PUT', '/users/profile', data);

// Farmers
export const getFarmerById = (id: string) => apiRequest<any>('GET', `/farmers/${id}`);

// Disputes
export const getDisputes = () => apiRequest<any[]>('GET', '/disputes');
export const getDisputeById = (id: string) => apiRequest<any>('GET', `/disputes/${id}`);
export const createDispute = (data: { order_id: string; description: string; evidence_url?: string | null }) => apiRequest<any>('POST', '/disputes', data);
export const respondToDispute = (id: string, data: { farmer_response: string; farmer_evidence_url?: string | null }) =>
  apiRequest<any>('PUT', `/disputes/${id}/respond`, data);
export const resolveDispute = (id: string, data: { action: 'approve_refund' | 'reject_dispute'; refund_type?: 'full' | 'partial' | 'none'; refund_amount?: number | null; resolution_note?: string | null }) =>
  apiRequest<any>('PUT', `/disputes/${id}/resolve`, data);
export const updateDispute = (id: string, data: { status: 'resolved' | 'dismissed'; resolution_note?: string | null }) => apiRequest<any>('PUT', `/disputes/${id}`, data);

// Ratings
export const getFarmerRatings = (farmerId: string) => apiRequest<any>('GET', `/ratings/farmer/${farmerId}`);
export const createRating = (data: { order_id: string; farmer_id: string; stars: number; comment?: string | null }) => apiRequest<any>('POST', '/ratings', data);

// Messages
export const getMessages = (orderId: string) => apiRequest<any[]>('GET', `/messages?order_id=${encodeURIComponent(orderId)}`);
export const createMessage = (data: { order_id: string; receiver_id: string; message: string }) => apiRequest<any>('POST', '/messages', data);

// Admin
export const getAdminUsers = (params?: { search?: string; role?: string; status?: string }) => {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.role && params.role !== 'all') query.set('role', params.role);
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<any[]>('GET', `/admin/users${suffix}`);
};

export const updateAdminUser = (id: string, is_active: boolean) => apiRequest<any>('PUT', `/admin/users/${id}`, { is_active });
export const deleteAdminUser = (id: string) => apiRequest<any>('DELETE', `/admin/users/${id}`);

export const getAdminProducts = () => apiRequest<any[]>('GET', '/admin/products');
export const updateAdminProduct = (id: string, data: { is_deleted?: boolean; is_under_review?: boolean }) =>
  apiRequest<any>('PUT', `/admin/products/${id}`, data);

export const getAdminOrders = (status?: string) => {
  const suffix = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<any[]>('GET', `/admin/orders${suffix}`);
};

export const getAdminDisputes = () => apiRequest<any[]>('GET', '/admin/disputes');
export const getAdminLogs = () => apiRequest<any[]>('GET', '/admin/logs');
