import axios from 'axios';
import { useAuthStore } from '@/store/authStore';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));
apiClient.interceptors.response.use((response) => response.data, (error) => {
    // Handle 401 Unauthorized - session expired
    if (error.response?.status === 401) {
        const { logout } = useAuthStore.getState();
        logout();
        window.location.href = '/login';
        return Promise.reject(error);
    }
    if (error.response?.data?.error) {
        return Promise.reject(new Error(error.response.data.error.message || 'API Error'));
    }
    return Promise.reject(error);
});
async function getResponse(request) {
    return (await request);
}
async function getData(request) {
    const response = await getResponse(request);
    if (!response.success || response.data === undefined) {
        throw new Error(response.error?.message || 'API Error');
    }
    return response.data;
}
export const adminApi = {
    // Auth
    sendOtp: (phone) => getResponse(apiClient.post('/auth/send-otp', { phone })),
    verifyOtp: async (phone, otp) => {
        const response = await getResponse(apiClient.post('/auth/verify-otp', { phone, otp }));
        return {
            success: response.success,
            data: response.data
                ? {
                    jwt: response.data.token,
                    user: {
                        userId: response.data.userId,
                        phone: response.data.phone,
                        role: response.data.role,
                        shopId: response.data.shopId,
                    },
                }
                : undefined,
            error: response.error,
        };
    },
    // KYC
    getKycQueue: (page, limit, status) => getData(apiClient.get('/admin/kyc/queue', {
        params: { page, limit, status },
    })),
    approveKyc: (id, notes) => getResponse(apiClient.patch(`/admin/kyc/${id}/approve`, { notes })),
    rejectKyc: (id, reason) => getResponse(apiClient.patch(`/admin/kyc/${id}/reject`, { reason })),
    // Shops
    getShops: (page, limit, search, kyc_status) => getData(apiClient.get('/admin/shops', {
        params: { page, limit, search, kyc_status },
    })),
    getTopShops: (limit) => getData(apiClient.get('/admin/analytics/top-shops', {
        params: { limit },
    })).then((data) => data.top_shops || []),
    suspendShop: (id, reason) => getResponse(apiClient.patch(`/admin/shops/${id}/suspend`, { reason })),
    reinstateShop: (id) => getResponse(apiClient.patch(`/admin/shops/${id}/reinstate`)),
    // Delivery Partners
    getDeliveryPartners: (page, limit, search, status) => getData(apiClient.get('/admin/delivery-partners', {
        params: { page, limit, search, status },
    })),
    suspendPartner: (id, reason) => getResponse(apiClient.patch(`/admin/delivery-partners/${id}/suspend`, { reason })),
    reinstatePartner: (id) => getResponse(apiClient.patch(`/admin/delivery-partners/${id}/reinstate`)),
    // Orders
    getOrders: (page, limit, status, search) => adminApi.getLiveOrders(status, page, limit),
    getLiveOrders: (status, page, limit) => getData(apiClient.get('/admin/orders/live', {
        params: { status, page, limit },
    })).then((data) => ({
        orders: data.orders.map((order) => ({
            id: order.id,
            customer_id: order.customer_id,
            shop_id: order.shop_id,
            status: order.status,
            total: 0,
            created_at: order.created_at,
            updated_at: order.created_at,
            pending_since: typeof order.pending_minutes === 'number'
                ? new Date(Date.now() - order.pending_minutes * 60000).toISOString()
                : undefined,
        })) || [],
        meta: {
            page: page || 1,
            total: data.count || 0,
            pages: Math.max(1, Math.ceil((data.count || 0) / (limit || 20))),
            limit: limit || 20,
        },
    })),
    escalateOrder: (id) => getResponse(apiClient.post(`/admin/orders/${id}/escalate`)),
    // Disputes
    getDisputes: (page, limit, status) => getData(apiClient.get('/admin/disputes', {
        params: { page, limit, status },
    })),
    getDisputeDetail: (id) => getData(apiClient.get(`/admin/disputes/${id}`)).then((data) => ({
        ...(data.dispute || { id, order_id: '' }),
        order_timeline: data.order_timeline || [],
        gps_trail: data.gps_trail || [],
    })),
    resolveDispute: (id, decision, refund_amount, notes) => getResponse(apiClient.patch(`/admin/disputes/${id}/resolve`, {
        decision,
        refund_amount,
        notes,
    })),
    // Analytics
    getAnalytics: () => getData(apiClient.get('/admin/analytics', {})),
    getDailyAnalytics: (range, date) => getData(apiClient.get('/admin/analytics/daily', {
        params: { range, date },
    })),
    // Broadcast
    sendBroadcast: (message) => getResponse(apiClient.post('/admin/broadcast', {
        title: 'Admin Broadcast',
        body: message,
        target: 'customers',
    })),
    createBroadcast: (title, body, target, scheduled_at) => getResponse(apiClient.post('/admin/broadcast', {
        title,
        body,
        target,
        ...(scheduled_at ? { scheduled_at } : {}),
    })),
    getBroadcastHistory: (page, limit) => getData(apiClient.get('/admin/broadcast/history', {
        params: { page, limit },
    })),
    // Moderation
    getModerationQueue: (page, limit, type) => getData(apiClient.get('/admin/moderation/queue', {
        params: { page, limit, type },
    })),
    approveModerationItem: (id, content_type) => getResponse(apiClient.post(`/admin/moderation/${id}/approve`, { content_type })),
    removeModerationItem: (id, content_type, reason) => getResponse(apiClient.post(`/admin/moderation/${id}/remove`, {
        content_type,
        ...(reason ? { reason } : {}),
    })),
};
export default apiClient;
//# sourceMappingURL=api.js.map