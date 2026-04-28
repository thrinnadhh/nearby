import { AxiosInstance } from 'axios';
import { Analytics, ApiResponse, BroadcastHistoryResponse, DailyAnalyticsResponse, DeliveryPartnersResponse, DisputeDetail, KYCQueueResponse, ModerationQueueResponse, OrdersResponse, ShopsResponse, TopShop, User } from '@/types/admin';
declare const apiClient: AxiosInstance;
export declare const adminApi: {
    sendOtp: (phone: string) => Promise<ApiResponse<{
        status: string;
        expiresIn: number;
    }>>;
    verifyOtp: (phone: string, otp: string) => Promise<ApiResponse<{
        jwt: string;
        user: User;
    }>>;
    getKycQueue: (page?: number, limit?: number, status?: string) => Promise<KYCQueueResponse>;
    approveKyc: (id: string, notes?: string) => Promise<ApiResponse<unknown>>;
    rejectKyc: (id: string, reason: string) => Promise<ApiResponse<unknown>>;
    getShops: (page?: number, limit?: number, search?: string, kyc_status?: string) => Promise<ShopsResponse>;
    getTopShops: (limit?: number) => Promise<TopShop[]>;
    suspendShop: (id: string, reason: string) => Promise<ApiResponse<unknown>>;
    reinstateShop: (id: string) => Promise<ApiResponse<unknown>>;
    getDeliveryPartners: (page?: number, limit?: number, search?: string, status?: string) => Promise<DeliveryPartnersResponse>;
    suspendPartner: (id: string, reason: string) => Promise<ApiResponse<unknown>>;
    reinstatePartner: (id: string) => Promise<ApiResponse<unknown>>;
    getOrders: (page?: number, limit?: number, status?: string, search?: string) => Promise<OrdersResponse>;
    getLiveOrders: (status?: string, page?: number, limit?: number) => Promise<OrdersResponse>;
    escalateOrder: (id: string) => Promise<ApiResponse<unknown>>;
    getDisputes: (page?: number, limit?: number, status?: string) => Promise<{
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
        meta: {
            page: number;
            total: number;
            pages: number;
            limit: number;
        };
    }>;
    getDisputeDetail: (id: string) => Promise<DisputeDetail>;
    resolveDispute: (id: string, decision: "approve" | "deny", refund_amount: number, notes?: string) => Promise<ApiResponse<unknown>>;
    getAnalytics: () => Promise<Analytics>;
    getDailyAnalytics: (range?: string, date?: string) => Promise<DailyAnalyticsResponse>;
    sendBroadcast: (message: string) => Promise<ApiResponse<unknown>>;
    createBroadcast: (title: string, body: string, target?: string, scheduled_at?: string) => Promise<ApiResponse<unknown>>;
    getBroadcastHistory: (page?: number, limit?: number) => Promise<BroadcastHistoryResponse>;
    getModerationQueue: (page?: number, limit?: number, type?: string) => Promise<ModerationQueueResponse>;
    approveModerationItem: (id: string, content_type: "review" | "product") => Promise<ApiResponse<unknown>>;
    removeModerationItem: (id: string, content_type: "review" | "product", reason?: string) => Promise<ApiResponse<unknown>>;
};
export default apiClient;
//# sourceMappingURL=api.d.ts.map