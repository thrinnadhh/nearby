import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  Analytics,
  ApiResponse,
  BroadcastHistoryResponse,
  DailyAnalyticsResponse,
  DeliveryPartnersResponse,
  DisputeDetail,
  KYCQueueResponse,
  ModerationQueueResponse,
  OrdersResponse,
  ShopsResponse,
  TopShop,
  User,
} from '@/types/admin';
import { useAuthStore } from '@/store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<ApiResponse<unknown>>) => {
    // Handle 401 Unauthorized - session expired
    if (error.response?.status === 401) {
      const { logout } = useAuthStore.getState();
      logout();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (error.response?.data?.error) {
      return Promise.reject(
        new Error(error.response.data.error.message || 'API Error'),
      );
    }
    return Promise.reject(error);
  },
);

async function getResponse<T>(request: Promise<unknown>): Promise<ApiResponse<T>> {
  return (await request) as ApiResponse<T>;
}

async function getData<T>(request: Promise<unknown>): Promise<T> {
  const response = await getResponse<T>(request);
  if (!response.success || response.data === undefined) {
    throw new Error(response.error?.message || 'API Error');
  }
  return response.data;
}

export const adminApi = {
  // Auth
  sendOtp: (phone: string): Promise<ApiResponse<{ status: string; expiresIn: number }>> =>
    getResponse(apiClient.post('/auth/send-otp', { phone })),

  verifyOtp: async (
    phone: string,
    otp: string,
  ): Promise<ApiResponse<{ jwt: string; user: User }>> => {
    const response = await getResponse<{
      userId: string;
      phone: string;
      role: string;
      token: string;
      shopId?: string;
    }>(apiClient.post('/auth/verify-otp', { phone, otp }));

    return {
      success: response.success,
      data: response.data
        ? {
            jwt: response.data.token,
            user: {
              userId: response.data.userId,
              phone: response.data.phone,
              role: response.data.role as User['role'],
              shopId: response.data.shopId,
            },
          }
        : undefined,
      error: response.error,
    };
  },

  // KYC
  getKycQueue: (
    page?: number,
    limit?: number,
    status?: string,
  ): Promise<KYCQueueResponse> =>
    getData(apiClient.get('/admin/kyc/queue', {
      params: { page, limit, status },
    })),

  approveKyc: (id: string, notes?: string): Promise<ApiResponse<unknown>> =>
    getResponse(apiClient.patch(`/admin/kyc/${id}/approve`, { notes })),

  rejectKyc: (id: string, reason: string): Promise<ApiResponse<unknown>> =>
    getResponse(apiClient.patch(`/admin/kyc/${id}/reject`, { reason })),

  // Shops
  getShops: (
    page?: number,
    limit?: number,
    search?: string,
    kyc_status?: string,
  ): Promise<ShopsResponse> =>
    getData(apiClient.get('/admin/shops', {
      params: { page, limit, search, kyc_status },
    })),

  getTopShops: (
    limit?: number,
  ): Promise<TopShop[]> =>
    getData<{ top_shops: TopShop[] }>(apiClient.get('/admin/analytics/top-shops', {
      params: { limit },
    })).then((data) => data.top_shops || []),

  suspendShop: (id: string, reason: string): Promise<ApiResponse<unknown>> =>
    getResponse(apiClient.patch(`/admin/shops/${id}/suspend`, { reason })),

  reinstateShop: (id: string): Promise<ApiResponse<unknown>> =>
    getResponse(apiClient.patch(`/admin/shops/${id}/reinstate`)),

  // Delivery Partners
  getDeliveryPartners: (
    page?: number,
    limit?: number,
    search?: string,
    status?: string,
  ): Promise<DeliveryPartnersResponse> =>
    getData(apiClient.get('/admin/delivery-partners', {
      params: { page, limit, search, status },
    })),

  suspendPartner: (
    id: string,
    reason: string,
  ): Promise<ApiResponse<unknown>> =>
    getResponse(apiClient.patch(`/admin/delivery-partners/${id}/suspend`, { reason })),

  reinstatePartner: (id: string): Promise<ApiResponse<unknown>> =>
    getResponse(apiClient.patch(`/admin/delivery-partners/${id}/reinstate`)),

  // Orders
  getOrders: (
    page?: number,
    limit?: number,
    status?: string,
    search?: string,
  ): Promise<OrdersResponse> =>
    adminApi.getLiveOrders(status, page, limit),

  getLiveOrders: (
    status?: string,
    page?: number,
    limit?: number,
  ): Promise<OrdersResponse> =>
    getData<{
      orders: Array<{
        id: string;
        shop_id: string;
        customer_id: string;
        status: string;
        created_at: string;
        is_stuck?: boolean;
        pending_minutes?: number;
        accepted_minutes?: number;
      }>;
      count: number;
    }>(apiClient.get('/admin/orders/live', {
      params: { status, page, limit },
    })).then((data) => ({
      orders:
        data.orders.map((order) => ({
          id: order.id,
          customer_id: order.customer_id,
          shop_id: order.shop_id,
          status: order.status as OrdersResponse['orders'][number]['status'],
          total: 0,
          created_at: order.created_at,
          updated_at: order.created_at,
          pending_since:
            typeof order.pending_minutes === 'number'
              ? new Date(Date.now() - order.pending_minutes * 60_000).toISOString()
              : undefined,
        })) || [],
      meta: {
        page: page || 1,
        total: data.count || 0,
        pages: Math.max(1, Math.ceil((data.count || 0) / (limit || 20))),
        limit: limit || 20,
      },
    })),

  escalateOrder: (id: string): Promise<ApiResponse<unknown>> =>
    getResponse(apiClient.post(`/admin/orders/${id}/escalate`)),

  // Disputes
  getDisputes: (
    page?: number,
    limit?: number,
    status?: string,
  ): Promise<
    {
      disputes: Array<{
        id: string;
        customer_id: string;
        customer_phone: string;
        order_id: string;
        shop_id: string;
        shop_name: string;
        status: string;
        reason: string;
        created_at: string;
        updated_at: string;
      }>;
      meta: { page: number; total: number; pages: number; limit: number };
    }
  > =>
    getData(apiClient.get('/admin/disputes', {
      params: { page, limit, status },
    })),

  getDisputeDetail: (id: string): Promise<DisputeDetail> =>
    getData<{
      dispute: Omit<DisputeDetail, 'order_timeline' | 'gps_trail'>;
      order_timeline: DisputeDetail['order_timeline'];
      gps_trail: DisputeDetail['gps_trail'];
    }>(apiClient.get(`/admin/disputes/${id}`)).then((data) => ({
      ...(data.dispute || { id, order_id: '' }),
      order_timeline: data.order_timeline || [],
      gps_trail: data.gps_trail || [],
    })),

  resolveDispute: (
    id: string,
    decision: 'approve' | 'deny',
    refund_amount: number,
    notes?: string,
  ): Promise<ApiResponse<unknown>> =>
    getResponse(apiClient.patch(`/admin/disputes/${id}/resolve`, {
      decision,
      refund_amount,
      notes,
    })),

  // Analytics
  getAnalytics: (
  ): Promise<Analytics> =>
    getData(apiClient.get('/admin/analytics', {})),

  getDailyAnalytics: (
    range?: string,
    date?: string,
  ): Promise<DailyAnalyticsResponse> =>
    getData(apiClient.get('/admin/analytics/daily', {
      params: { range, date },
    })),

  // Broadcast
  sendBroadcast: (message: string): Promise<ApiResponse<unknown>> =>
    getResponse(apiClient.post('/admin/broadcast', {
      title: 'Admin Broadcast',
      body: message,
      target: 'customers',
    })),

  createBroadcast: (
    title: string,
    body: string,
    target?: string,
    scheduled_at?: string,
  ): Promise<ApiResponse<unknown>> =>
    getResponse(apiClient.post('/admin/broadcast', {
      title,
      body,
      target,
      ...(scheduled_at ? { scheduled_at } : {}),
    })),

  getBroadcastHistory: (
    page?: number,
    limit?: number,
  ): Promise<BroadcastHistoryResponse> =>
    getData(apiClient.get('/admin/broadcast/history', {
      params: { page, limit },
    })),

  // Moderation
  getModerationQueue: (
    page?: number,
    limit?: number,
    type?: string,
  ): Promise<ModerationQueueResponse> =>
    getData(apiClient.get('/admin/moderation/queue', {
      params: { page, limit, type },
    })),

  approveModerationItem: (
    id: string,
    content_type: 'review' | 'product',
  ): Promise<ApiResponse<unknown>> =>
    getResponse(apiClient.post(`/admin/moderation/${id}/approve`, { content_type })),

  removeModerationItem: (
    id: string,
    content_type: 'review' | 'product',
    reason?: string,
  ): Promise<ApiResponse<unknown>> =>
    getResponse(apiClient.post(`/admin/moderation/${id}/remove`, {
      content_type,
      ...(reason ? { reason } : {}),
    })),
};

export default apiClient;
