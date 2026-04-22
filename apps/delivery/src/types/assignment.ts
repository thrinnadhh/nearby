/**
 * Delivery assignment types — for real-time order assignments
 */

export interface OrderForDelivery {
  id: string;
  customerId: string;
  shopId: string;
  shopName: string;
  totalAmount: number;
  status:
    | 'pending'
    | 'accepted'
    | 'packing'
    | 'ready'
    | 'assigned'
    | 'picked_up'
    | 'out_for_delivery'
    | 'delivered';
  customerPhone: string;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  pickupLat: number;
  pickupLng: number;
  items: OrderItem[];
  createdAt: string;
  assignedAt?: string;
}

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface AssignmentAlert {
  orderId: string;
  orderData: OrderForDelivery;
  assignedAt: string;
  distanceKm: number;
  estimatedPickupTime: number; // seconds
  estimatedDeliveryTime: number; // seconds
}

export interface AssignmentState {
  currentAssignment: AssignmentAlert | null;
  pendingAssignments: AssignmentAlert[];
  acceptedAssignments: AssignmentAlert[];
  isListening: boolean;
  error: string | null;
  lastUpdate: string | null;
}

export interface AssignmentActions {
  setCurrentAssignment: (assignment: AssignmentAlert | null) => void;
  addPendingAssignment: (assignment: AssignmentAlert) => void;
  removePendingAssignment: (orderId: string) => void;
  addAcceptedAssignment: (assignment: AssignmentAlert) => void;
  removeAcceptedAssignment: (orderId: string) => void;
  setListening: (listening: boolean) => void;
  setError: (error: string | null) => void;
  setLastUpdate: (timestamp: string) => void;
  clearAll: () => void;
}

export interface SocketAssignmentEvent {
  orderId: string;
  orderData: OrderForDelivery;
  distanceKm: number;
  estimatedPickupTime: number;
  estimatedDeliveryTime: number;
}
