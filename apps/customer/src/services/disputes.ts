import { API_BASE_URL } from '@/config/api';

/**
 * Support & Dispute Management Service (Task 9.8)
 * 
 * Handles customer dispute creation, tracking, and resolution
 * Status flow: open → under_review → resolved/rejected/refunded
 */

export interface DisputeReason {
  id: string;
  label: string;
  description: string;
  category: 'order' | 'payment' | 'delivery' | 'quality' | 'other';
}

export interface Dispute {
  id: string;
  order_id: string;
  customer_id: string;
  reason: string;
  description: string;
  status: 'open' | 'under_review' | 'resolved' | 'rejected' | 'refunded';
  resolution_status: 'pending' | 'in_progress' | 'awaiting_customer' | 'closed';
  resolution_note?: string;
  refund_amount?: number;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  order?: {
    id: string;
    total_amount: number;
    shop_id: string;
    shop?: {
      id: string;
      name: string;
    };
    order_status: string;
  };
  messages?: DisputeMessage[];
}

export interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_type: 'customer' | 'admin' | 'system';
  sender_id: string;
  message: string;
  attachments?: string[];
  created_at: string;
}

export interface DisputeListParams {
  page?: number;
  limit?: number;
  status?: string | string[];
  resolution_status?: string;
  sort_by?: 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

export interface DisputeListResponse {
  data: Dispute[];
  meta: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface OpenDisputeInput {
  order_id: string;
  reason: string;
  description: string;
  attachments?: string[];
}

export interface DisputeComment {
  message: string;
  attachments?: string[];
}

/**
 * Get available dispute reasons
 * Used for dispute creation form dropdown
 */
export const getDisputeReasons = (): DisputeReason[] => {
  return [
    {
      id: 'wrong_item',
      label: 'Wrong Item Received',
      description: 'Received a different item than ordered',
      category: 'order',
    },
    {
      id: 'damaged_item',
      label: 'Damaged or Broken Item',
      description: 'Item arrived in damaged condition',
      category: 'quality',
    },
    {
      id: 'missing_item',
      label: 'Missing Item',
      description: 'Did not receive all ordered items',
      category: 'order',
    },
    {
      id: 'quality_issue',
      label: 'Quality Issue',
      description: 'Item quality below expectations or expired',
      category: 'quality',
    },
    {
      id: 'not_delivered',
      label: 'Order Not Delivered',
      description: 'Order was not delivered',
      category: 'delivery',
    },
    {
      id: 'late_delivery',
      label: 'Late Delivery',
      description: 'Order delivered much later than expected',
      category: 'delivery',
    },
    {
      id: 'payment_issue',
      label: 'Payment Issue',
      description: 'Was charged incorrectly or duplicate charge',
      category: 'payment',
    },
    {
      id: 'other',
      label: 'Other',
      description: 'Other issue not listed above',
      category: 'other',
    },
  ];
};

/**
 * Get dispute status badge color
 */
export const getDisputeStatusColor = (status: string): string => {
  switch (status) {
    case 'open':
      return '#f59e0b'; // Amber - Active issue
    case 'under_review':
      return '#3b82f6'; // Blue - Being reviewed
    case 'resolved':
      return '#10b981'; // Green - Resolved
    case 'refunded':
      return '#10b981'; // Green - Refunded (positive)
    case 'rejected':
      return '#ef4444'; // Red - Rejected
    default:
      return '#6b7280'; // Gray
  }
};

/**
 * Get dispute status label
 */
export const getDisputeStatusLabel = (status: string): string => {
  switch (status) {
    case 'open':
      return 'Open';
    case 'under_review':
      return 'Under Review';
    case 'resolved':
      return 'Resolved';
    case 'refunded':
      return 'Refunded';
    case 'rejected':
      return 'Rejected';
    default:
      return 'Unknown';
  }
};

/**
 * Get resolution status label
 */
export const getResolutionStatusLabel = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'Awaiting Review';
    case 'in_progress':
      return 'In Progress';
    case 'awaiting_customer':
      return 'Awaiting Your Response';
    case 'closed':
      return 'Closed';
    default:
      return 'Pending';
  }
};

/**
 * Get dispute reason label from reason id
 */
export const getReasonLabel = (reasonId: string): string => {
  const reasons = getDisputeReasons();
  const reason = reasons.find((r) => r.id === reasonId);
  return reason ? reason.label : 'Other';
};

/**
 * Open a new dispute for an order
 */
export const openDispute = async (
  input: OpenDisputeInput,
  token: string
): Promise<Dispute> => {
  const response = await fetch(`${API_BASE_URL}/disputes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to open dispute');
  }

  const data = await response.json();
  return data.data;
};

/**
 * Get list of customer's disputes with pagination and filtering
 */
export const getDisputes = async (
  params: DisputeListParams = {},
  token: string
): Promise<DisputeListResponse> => {
  const {
    page = 1,
    limit = 10,
    status,
    resolution_status,
    sort_by = 'created_at',
    sort_order = 'desc',
  } = params;

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sort_by,
    sort_order,
  });

  // Handle status filter (single or array)
  if (status) {
    const statuses = Array.isArray(status) ? status : [status];
    queryParams.append('status', statuses.join(','));
  }

  if (resolution_status) {
    queryParams.append('resolution_status', resolution_status);
  }

  const response = await fetch(
    `${API_BASE_URL}/disputes?${queryParams.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch disputes');
  }

  const data = await response.json();
  return data.data;
};

/**
 * Get dispute detail with full message history
 */
export const getDisputeDetail = async (
  disputeId: string,
  token: string
): Promise<Dispute> => {
  const response = await fetch(`${API_BASE_URL}/disputes/${disputeId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch dispute');
  }

  const data = await response.json();
  return data.data;
};

/**
 * Add comment/message to dispute
 */
export const addDisputeMessage = async (
  disputeId: string,
  comment: DisputeComment,
  token: string
): Promise<DisputeMessage> => {
  const response = await fetch(
    `${API_BASE_URL}/disputes/${disputeId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(comment),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to add message');
  }

  const data = await response.json();
  return data.data;
};

/**
 * Get dispute resolution status (for polling)
 */
export const getDisputeResolutionStatus = async (
  disputeId: string,
  token: string
): Promise<{
  status: string;
  resolution_status: string;
  resolution_note?: string;
  refund_amount?: number;
  resolved_at?: string;
}> => {
  const response = await fetch(
    `${API_BASE_URL}/disputes/${disputeId}/status`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch status');
  }

  const data = await response.json();
  return data.data;
};

/**
 * Accept dispute resolution (for awaiting_customer status)
 */
export const acceptDisputeResolution = async (
  disputeId: string,
  token: string
): Promise<Dispute> => {
  const response = await fetch(
    `${API_BASE_URL}/disputes/${disputeId}/accept-resolution`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to accept resolution');
  }

  const data = await response.json();
  return data.data;
};

/**
 * Close dispute as customer
 */
export const closeDispute = async (
  disputeId: string,
  token: string
): Promise<Dispute> => {
  const response = await fetch(`${API_BASE_URL}/disputes/${disputeId}/close`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to close dispute');
  }

  const data = await response.json();
  return data.data;
};
