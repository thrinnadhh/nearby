/**
 * Chat API service for Task 12.11
 */

import { client } from './api';
import { ApiResponse, PaginationMeta } from '@/types/common';
import { Conversation, ChatMessage } from '@/types/chat';
import logger from '@/utils/logger';
import { AppError } from '@/types/common';

/**
 * Fetch conversations for a shop
 */
export async function getConversations(
  shopId: string,
  page: number = 1,
  limit: number = 20,
  search?: string
): Promise<{
  conversations: Conversation[];
  meta: PaginationMeta;
}> {
  try {
    const params: any = { page, limit };
    if (search) {
      params.search = search;
    }

    const response = await client.get<ApiResponse<Conversation[]>>(
      `/shops/${shopId}/chats`,
      { params }
    );

    if (!response.data.success) {
      throw new AppError(
        response.data.error?.code || 'UNKNOWN_ERROR',
        response.data.error?.message || 'Failed to fetch conversations'
      );
    }

    logger.info('Conversations fetched', {
      shopId,
      page,
      limit,
      count: response.data.data?.length || 0,
    });

    return {
      conversations: response.data.data as Conversation[],
      meta: response.data.meta as PaginationMeta,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : 'Failed to fetch conversations';
    logger.error('Conversations fetch error', {
      shopId,
      error: message,
    });

    throw new AppError(
      'CONVERSATIONS_FETCH_ERROR',
      message,
      (error as any)?.response?.status
    );
  }
}

/**
 * Fetch message history for a conversation
 */
export async function getMessages(
  shopId: string,
  customerId: string,
  page: number = 1,
  limit: number = 50
): Promise<{
  messages: ChatMessage[];
  meta: PaginationMeta;
}> {
  try {
    const response = await client.get<ApiResponse<ChatMessage[]>>(
      `/shops/${shopId}/chats/${customerId}/messages`,
      { params: { page, limit } }
    );

    if (!response.data.success) {
      throw new AppError(
        response.data.error?.code || 'UNKNOWN_ERROR',
        response.data.error?.message || 'Failed to fetch messages'
      );
    }

    logger.info('Messages fetched', {
      shopId,
      customerId,
      page,
      limit,
      count: response.data.data?.length || 0,
    });

    return {
      messages: response.data.data as ChatMessage[],
      meta: response.data.meta as PaginationMeta,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : 'Failed to fetch messages';
    logger.error('Messages fetch error', {
      shopId,
      customerId,
      error: message,
    });

    throw new AppError(
      'MESSAGES_FETCH_ERROR',
      message,
      (error as any)?.response?.status
    );
  }
}
