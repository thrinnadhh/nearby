import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import {
  AppError,
  FORBIDDEN,
  INSUFFICIENT_STOCK,
  INTERNAL_ERROR,
  ORDER_NOT_CANCELLABLE,
  PRODUCT_NOT_FOUND,
  SHOP_CLOSED,
  SHOP_NOT_FOUND,
  SHOP_NOT_VERIFIED,
} from '../utils/errors.js';
import { supabase } from './supabase.js';
import { notifyShopQueue } from '../jobs/notifyShop.js';
import { autoCancelQueue } from '../jobs/autoCancel.js';
import { notifyCustomerQueue } from '../jobs/notifyCustomer.js';
import { assignDeliveryQueue } from '../jobs/assignDelivery.js';
import { emitOrderEvent } from '../socket/ioRegistry.js';

class OrderService {
  static async _fetchOrderItems(orderId) {
    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select('id, order_id, product_id, quantity, unit_price_paise, total_paise, cancelled_quantity, cancelled_total_paise, cancellation_reason, cancelled_at')
      .eq('order_id', orderId);

    if (error) {
      throw new AppError(INTERNAL_ERROR, 'Failed to fetch order items.', 500);
    }

    return orderItems || [];
  }

  static _toResponse(orderRow, items) {
    return Object.freeze({
      id: orderRow.id,
      customerId: orderRow.customer_id,
      shopId: orderRow.shop_id,
      status: orderRow.status,
      totalPaise: orderRow.total_paise,
      paymentMethod: orderRow.payment_method,
      paymentStatus: orderRow.payment_status,
      createdAt: orderRow.created_at,
      updatedAt: orderRow.updated_at,
      items: items.map((item) => ({
        id: item.id,
        productId: item.product_id,
        quantity: item.quantity,
        remainingQuantity: Math.max(item.quantity - (item.cancelled_quantity || 0), 0),
        cancelledQuantity: item.cancelled_quantity || 0,
        unitPricePaise: item.unit_price_paise,
        totalPaise: item.total_paise,
        remainingTotalPaise: Math.max(item.total_paise - (item.cancelled_total_paise || 0), 0),
        cancelledTotalPaise: item.cancelled_total_paise || 0,
        cancellationReason: item.cancellation_reason || null,
        cancelledAt: item.cancelled_at || null,
      })),
    });
  }

  static _activeQuantity(item) {
    return Math.max(item.quantity - (item.cancelled_quantity || 0), 0);
  }

  static async _restoreActiveOrderItemStock(orderItems) {
    const restorableItems = orderItems.filter((item) => this._activeQuantity(item) > 0);
    if (restorableItems.length === 0) {
      return;
    }

    const productIds = restorableItems.map((item) => item.product_id);
    const { data: products, error } = await supabase
      .from('products')
      .select('id, stock_quantity')
      .in('id', productIds);

    if (error) {
      throw new AppError(INTERNAL_ERROR, 'Failed to restore stock.', 500);
    }

    const stockMap = new Map((products || []).map((product) => [product.id, product.stock_quantity]));

    await Promise.all(
      restorableItems.map((item) => {
        const currentStock = stockMap.get(item.product_id) || 0;
        const nextStock = currentStock + this._activeQuantity(item);

        return supabase
          .from('products')
          .update({
            stock_quantity: nextStock,
            is_available: nextStock > 0,
          })
          .eq('id', item.product_id);
      })
    );
  }

  static _emitOrderStatus(orderId, event, order, extras = {}) {
    emitOrderEvent(orderId, event, {
      order: this._toResponse(order, extras.items || []),
      ...Object.fromEntries(Object.entries(extras).filter(([key]) => key !== 'items')),
    });
  }

  static async _fetchOrder(orderId) {
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, customer_id, shop_id, status, total_paise, payment_method, payment_status, created_at, updated_at, accepted_at, delivered_at')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      throw new AppError('ORDER_NOT_FOUND', 'Order not found.', 404);
    }

    return order;
  }

  static _assertOrderAccess(user, order) {
    if (user.role === 'customer' && order.customer_id !== user.userId) {
      throw new AppError(FORBIDDEN, 'You can only access your own orders.', 403);
    }

    if (user.role === 'shop_owner' && order.shop_id !== user.shopId) {
      throw new AppError(FORBIDDEN, 'You can only access your shop orders.', 403);
    }
  }

  static async _queueCustomerNotification(orderId, customerId, status) {
    try {
      await notifyCustomerQueue.add('notify-customer', { orderId, customerId, status });
    } catch (error) {
      logger.warn('OrderService: failed to queue notify-customer job', {
        orderId,
        error: error.message,
      });
    }
  }

  static async _getShop(shopId) {
    const { data: shop, error } = await supabase
      .from('shops')
      .select('id, owner_id, is_open, is_verified')
      .eq('id', shopId)
      .single();

    if (error || !shop) {
      throw new AppError(SHOP_NOT_FOUND, 'Shop does not exist.', 404);
    }

    if (!shop.is_verified) {
      throw new AppError(SHOP_NOT_VERIFIED, 'Shop is not yet verified.', 403);
    }

    if (!shop.is_open) {
      throw new AppError(SHOP_CLOSED, 'Shop is currently closed.', 409);
    }

    return shop;
  }

  static _validateProducts(products, requestedItems, shopId) {
    if (!products || products.length !== requestedItems.length) {
      throw new AppError(PRODUCT_NOT_FOUND, 'One or more products were not found.', 404);
    }

    const productMap = new Map(products.map((product) => [product.id, product]));

    return requestedItems.map((item) => {
      const product = productMap.get(item.product_id);

      if (!product) {
        throw new AppError(PRODUCT_NOT_FOUND, 'One or more products were not found.', 404);
      }

      if (product.shop_id !== shopId || product.deleted_at) {
        throw new AppError(PRODUCT_NOT_FOUND, 'One or more products were not found.', 404);
      }

      if (!product.is_available || product.stock_quantity <= 0) {
        throw new AppError(INSUFFICIENT_STOCK, `${product.name} is out of stock.`, 409);
      }

      if (product.stock_quantity < item.qty) {
        throw new AppError(
          INSUFFICIENT_STOCK,
          `Only ${product.stock_quantity} unit(s) available for ${product.name}.`,
          409
        );
      }

      return {
        product,
        quantity: item.qty,
        unitPricePaise: product.price,
        totalPaise: product.price * item.qty,
      };
    });
  }

  static async _revertStock(reservations) {
    await Promise.all(
      reservations.map(({ productId, previousStock, previousAvailability }) =>
        supabase
          .from('products')
          .update({
            stock_quantity: previousStock,
            is_available: previousAvailability,
          })
          .eq('id', productId)
      )
    );
  }

  static async _queuePostCreateJobs(order) {
    try {
      await notifyShopQueue.add('notify-shop', {
        orderId: order.id,
        shopId: order.shop_id,
        customerId: order.customer_id,
      });
    } catch (error) {
      logger.warn('OrderService: failed to queue notify-shop job', {
        orderId: order.id,
        error: error.message,
      });
    }

    try {
      await autoCancelQueue.add(
        'auto-cancel',
        { orderId: order.id, shopId: order.shop_id },
        { delay: 3 * 60 * 1000 }
      );
    } catch (error) {
      logger.warn('OrderService: failed to queue auto-cancel job', {
        orderId: order.id,
        error: error.message,
      });
    }
  }

  static async createOrder(customerId, payload, options = {}) {
    const { shop_id: shopId, items, payment_method: paymentMethod } = payload;
    const { idempotencyKey = null } = options;

    await this._getShop(shopId);

    const productIds = items.map((item) => item.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, shop_id, name, price, stock_quantity, is_available, deleted_at')
      .in('id', productIds);

    if (productsError) {
      logger.error('OrderService: failed to fetch products', {
        shopId,
        customerId,
        error: productsError.message,
      });
      throw new AppError(INTERNAL_ERROR, 'Failed to validate products.', 500);
    }

    const lineItems = this._validateProducts(products, items, shopId);
    const totalPaise = lineItems.reduce((sum, item) => sum + item.totalPaise, 0);
    const stockReservations = [];

    try {
      for (const lineItem of lineItems) {
        const nextStock = lineItem.product.stock_quantity - lineItem.quantity;
        const nextAvailability = nextStock > 0;

        const updateQuery = supabase
          .from('products')
          .update({
            stock_quantity: nextStock,
            is_available: nextAvailability,
          })
          .eq('id', lineItem.product.id);

        if (typeof updateQuery.gte === 'function') {
          updateQuery.gte('stock_quantity', lineItem.quantity);
        }

        const { error: stockError } = await updateQuery;

        if (stockError) {
          logger.warn('OrderService: stock reservation failed', {
            productId: lineItem.product.id,
            customerId,
            error: stockError.message,
          });
          throw new AppError(
            INSUFFICIENT_STOCK,
            `Unable to reserve stock for ${lineItem.product.name}.`,
            409
          );
        }

        stockReservations.push({
          productId: lineItem.product.id,
          previousStock: lineItem.product.stock_quantity,
          previousAvailability: lineItem.product.is_available,
        });
      }

      const orderId = uuidv4();
      const orderInsert = {
        id: orderId,
        customer_id: customerId,
        shop_id: shopId,
        status: 'pending',
        total_paise: totalPaise,
        payment_method: paymentMethod,
        payment_status: 'pending',
        idempotency_key: idempotencyKey,
      };

      const { data: orderRow, error: orderError } = await supabase
        .from('orders')
        .insert(orderInsert)
        .select()
        .single();

      if (orderError || !orderRow) {
        logger.error('OrderService: order insert failed', {
          customerId,
          shopId,
          error: orderError?.message,
        });
        throw new AppError(INTERNAL_ERROR, 'Failed to create order.', 500);
      }

      const orderItemsPayload = lineItems.map((lineItem) => ({
        id: uuidv4(),
        order_id: orderId,
        product_id: lineItem.product.id,
        quantity: lineItem.quantity,
        unit_price_paise: lineItem.unitPricePaise,
        total_paise: lineItem.totalPaise,
      }));

      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsPayload)
        .select();

      if (itemsError) {
        logger.error('OrderService: order items insert failed', {
          orderId,
          error: itemsError.message,
        });
        throw new AppError(INTERNAL_ERROR, 'Failed to create order items.', 500);
      }

      await this._queuePostCreateJobs(orderRow);
      const response = this._toResponse(orderRow, orderItems || orderItemsPayload);
      emitOrderEvent(orderRow.id, 'order:created', { order: response });
      return response;
    } catch (error) {
      if (stockReservations.length > 0) {
        try {
          await this._revertStock(stockReservations);
        } catch (revertError) {
          logger.error('OrderService: stock rollback failed', {
            customerId,
            shopId,
            error: revertError.message,
          });
        }
      }

      throw error;
    }
  }

  static async listOrders(user) {
    let query = supabase
      .from('orders')
      .select('id, customer_id, shop_id, status, total_paise, payment_method, payment_status, created_at, updated_at');

    if (user.role === 'customer') {
      query = query.eq('customer_id', user.userId);
    } else if (user.role === 'shop_owner') {
      query = query.eq('shop_id', user.shopId);
    } else {
      throw new AppError(FORBIDDEN, 'Unsupported role for order listing.', 403);
    }

    if (typeof query.order === 'function') {
      query = query.order('created_at', { ascending: false });
    }

    const { data: orders, error } = await query;

    if (error) {
      throw new AppError(INTERNAL_ERROR, 'Failed to fetch orders.', 500);
    }

    return (orders || []).map((order) => this._toResponse(order, []));
  }

  static async getOrder(user, orderId) {
    const order = await this._fetchOrder(orderId);
    this._assertOrderAccess(user, order);
    const orderItems = await this._fetchOrderItems(orderId);
    return this._toResponse(order, orderItems);
  }

  static async acceptOrder(user, orderId) {
    const order = await this._fetchOrder(orderId);
    this._assertOrderAccess(user, order);

    if (user.role !== 'shop_owner') {
      throw new AppError(FORBIDDEN, 'Only shop owners can accept orders.', 403);
    }
    if (order.status !== 'pending') {
      throw new AppError('ORDER_ACCEPT_EXPIRED', 'Only pending orders can be accepted.', 409);
    }

    const acceptedAt = new Date().toISOString();
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({ status: 'accepted', accepted_at: acceptedAt, updated_at: acceptedAt })
      .eq('id', orderId)
      .select()
      .single();

    if (error || !updatedOrder) {
      throw new AppError(INTERNAL_ERROR, 'Failed to accept order.', 500);
    }

    try {
      await assignDeliveryQueue.add('assign-delivery', {
        orderId,
        shopId: updatedOrder.shop_id,
        customerId: updatedOrder.customer_id,
      });
    } catch (queueError) {
      logger.warn('OrderService: failed to queue assign-delivery job', {
        orderId,
        error: queueError.message,
      });
    }

    await this._queueCustomerNotification(orderId, updatedOrder.customer_id, 'accepted');
    const orderItems = await this._fetchOrderItems(orderId);
    this._emitOrderStatus(orderId, 'order:status_updated', updatedOrder, { items: orderItems });
    return this._toResponse(updatedOrder, orderItems);
  }

  static async rejectOrder(user, orderId) {
    const order = await this._fetchOrder(orderId);
    this._assertOrderAccess(user, order);

    if (user.role !== 'shop_owner') {
      throw new AppError(FORBIDDEN, 'Only shop owners can reject orders.', 403);
    }
    if (order.status !== 'pending') {
      throw new AppError('ORDER_NOT_CANCELLABLE', 'Only pending orders can be rejected.', 409);
    }

    const orderItems = await this._fetchOrderItems(orderId);
    await this._restoreActiveOrderItemStock(orderItems);

    const updatedAt = new Date().toISOString();
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', payment_status: 'failed', updated_at: updatedAt })
      .eq('id', orderId)
      .select()
      .single();

    if (error || !updatedOrder) {
      throw new AppError(INTERNAL_ERROR, 'Failed to reject order.', 500);
    }

    await this._queueCustomerNotification(orderId, updatedOrder.customer_id, 'cancelled');
    this._emitOrderStatus(orderId, 'order:status_updated', updatedOrder, { items: orderItems });
    return this._toResponse(updatedOrder, orderItems);
  }

  static async markReady(user, orderId) {
    const order = await this._fetchOrder(orderId);
    this._assertOrderAccess(user, order);

    if (user.role !== 'shop_owner') {
      throw new AppError(FORBIDDEN, 'Only shop owners can mark orders ready.', 403);
    }
    if (!['accepted', 'packing'].includes(order.status)) {
      throw new AppError('ORDER_NOT_CANCELLABLE', 'Only accepted or packing orders can be marked ready.', 409);
    }

    const updatedAt = new Date().toISOString();
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({ status: 'ready', updated_at: updatedAt })
      .eq('id', orderId)
      .select()
      .single();

    if (error || !updatedOrder) {
      throw new AppError(INTERNAL_ERROR, 'Failed to update order status.', 500);
    }

    await this._queueCustomerNotification(orderId, updatedOrder.customer_id, 'ready');
    const orderItems = await this._fetchOrderItems(orderId);
    this._emitOrderStatus(orderId, 'order:status_updated', updatedOrder, { items: orderItems });
    return this._toResponse(updatedOrder, orderItems);
  }

  static async cancelOrder(user, orderId) {
    const order = await this._fetchOrder(orderId);
    this._assertOrderAccess(user, order);

    if (user.role !== 'customer') {
      throw new AppError(FORBIDDEN, 'Only customers can cancel orders from this endpoint.', 403);
    }
    if (!['pending', 'accepted'].includes(order.status)) {
      throw new AppError('ORDER_NOT_CANCELLABLE', 'This order can no longer be cancelled.', 409);
    }

    const orderItems = await this._fetchOrderItems(orderId);
    await this._restoreActiveOrderItemStock(orderItems);

    const updatedAt = new Date().toISOString();
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', payment_status: 'failed', updated_at: updatedAt })
      .eq('id', orderId)
      .select()
      .single();

    if (error || !updatedOrder) {
      throw new AppError(INTERNAL_ERROR, 'Failed to cancel order.', 500);
    }

    this._emitOrderStatus(orderId, 'order:status_updated', updatedOrder, { items: orderItems });
    return this._toResponse(updatedOrder, orderItems);
  }

  static async partialCancelItems(user, orderId, payload) {
    const order = await this._fetchOrder(orderId);
    this._assertOrderAccess(user, order);

    if (user.role !== 'shop_owner') {
      throw new AppError(FORBIDDEN, 'Only shop owners can partially cancel order items.', 403);
    }

    if (!['pending', 'accepted', 'packing'].includes(order.status)) {
      throw new AppError(
        ORDER_NOT_CANCELLABLE,
        'Items can only be removed before the order is ready.',
        409
      );
    }

    const orderItems = await this._fetchOrderItems(orderId);
    const itemMap = new Map(orderItems.map((item) => [item.id, item]));
    const now = new Date().toISOString();
    let totalReduction = 0;

    for (const requestedItem of payload.items) {
      const orderItem = itemMap.get(requestedItem.item_id);

      if (!orderItem) {
        throw new AppError('ORDER_ITEM_NOT_FOUND', 'One or more order items were not found.', 404);
      }

      const remainingQuantity = this._activeQuantity(orderItem);
      if (requestedItem.cancel_quantity > remainingQuantity) {
        throw new AppError(
          ORDER_NOT_CANCELLABLE,
          `Only ${remainingQuantity} unit(s) can be removed for item ${orderItem.id}.`,
          409
        );
      }

      const nextCancelledQuantity = (orderItem.cancelled_quantity || 0) + requestedItem.cancel_quantity;
      const deltaPaise = requestedItem.cancel_quantity * orderItem.unit_price_paise;
      totalReduction += deltaPaise;

      const { error: updateItemError } = await supabase
        .from('order_items')
        .update({
          cancelled_quantity: nextCancelledQuantity,
          cancelled_total_paise: (orderItem.cancelled_total_paise || 0) + deltaPaise,
          cancellation_reason: payload.reason,
          cancelled_at: now,
        })
        .eq('id', orderItem.id);

      if (updateItemError) {
        throw new AppError(INTERNAL_ERROR, 'Failed to update order items.', 500);
      }

      itemMap.set(orderItem.id, {
        ...orderItem,
        cancelled_quantity: nextCancelledQuantity,
        cancelled_total_paise: (orderItem.cancelled_total_paise || 0) + deltaPaise,
        cancellation_reason: payload.reason,
        cancelled_at: now,
      });
    }

    const remainingTotalPaise = Math.max(order.total_paise - totalReduction, 0);
    const nextStatus = remainingTotalPaise === 0 ? 'cancelled' : order.status;
    const nextPaymentStatus = remainingTotalPaise === 0 ? 'failed' : order.payment_status;

    const { data: updatedOrder, error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        total_paise: remainingTotalPaise,
        status: nextStatus,
        payment_status: nextPaymentStatus,
        updated_at: now,
      })
      .eq('id', orderId)
      .select()
      .single();

    if (orderUpdateError || !updatedOrder) {
      throw new AppError(INTERNAL_ERROR, 'Failed to update order total.', 500);
    }

    const updatedItems = Array.from(itemMap.values());
    await this._queueCustomerNotification(
      orderId,
      updatedOrder.customer_id,
      nextStatus === 'cancelled' ? 'cancelled' : 'updated'
    );
    this._emitOrderStatus(orderId, 'order:items_updated', updatedOrder, {
      items: updatedItems,
      reason: payload.reason,
      totalReductionPaise: totalReduction,
    });

    return this._toResponse(updatedOrder, updatedItems);
  }
}

export default OrderService;
