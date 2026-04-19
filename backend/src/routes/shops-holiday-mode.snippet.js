/**
 * Holiday mode endpoint for shops.js
 * PATCH /api/v1/shops/:shopId/holiday-mode
 * 
 * To add to shops.js after the toggle endpoint:
 */

router.patch(
  '/:shopId/holiday-mode',
  authenticate,
  roleGuard(['shop_owner']),
  rateLimit('shop-holiday', 10, 60),
  shopOwnerGuard(),
  async (req, res, next) => {
    try {
      const { shopId } = req.params;
      const { holidayMode } = req.body;

      // 1. Validate request
      if (!holidayMode || typeof holidayMode !== 'object') {
        return res.status(400).json(
          errorResponse('INVALID_REQUEST', 'holidayMode object is required')
        );
      }

      const { isOnHoliday, startDate, endDate } = holidayMode;

      // 2. Validate dates if turning on holiday
      if (isOnHoliday) {
        if (!startDate || !endDate) {
          return res.status(400).json(
            errorResponse('INVALID_DATES', 'startDate and endDate required for holiday mode')
          );
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end <= start) {
          return res.status(400).json(
            errorResponse('INVALID_DATE_RANGE', 'endDate must be after startDate')
          );
        }
      }

      // 3. Update shop in database
      const { data: shop, error } = await supabase
        .from('shops')
        .update({
          is_on_holiday: isOnHoliday,
          holiday_start_date: isOnHoliday ? startDate : null,
          holiday_end_date: isOnHoliday ? endDate : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shopId)
        .eq('owner_id', req.user.userId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update holiday mode', {
          shopId,
          error: error.message,
        });
        throw new AppError(INTERNAL_ERROR, 'Failed to update holiday mode', 500);
      }

      if (!shop) {
        return res.status(404).json(
          errorResponse('SHOP_NOT_FOUND', 'Shop not found or you do not have permission')
        );
      }

      // 4. Broadcast status change via Socket.IO
      const io = getRealtimeServer();
      if (io) {
        io.to(`shop:${shopId}`).emit('holiday_mode_changed', {
          shopId,
          isOnHoliday: shop.is_on_holiday,
          startDate: shop.holiday_start_date,
          endDate: shop.holiday_end_date,
        });
      }

      // 5. Return success
      logger.info('Holiday mode updated successfully', {
        shopId,
        userId: req.user.userId,
        isOnHoliday,
        startDate,
        endDate,
      });

      res.status(200).json(
        successResponse({
          isOpen: shop.is_open,
          holidayMode: {
            isOnHoliday: shop.is_on_holiday,
            startDate: shop.holiday_start_date,
            endDate: shop.holiday_end_date,
          },
          lastStatusChange: shop.updated_at,
        })
      );
    } catch (err) {
      logger.error('Holiday mode endpoint error', {
        error: err.message,
        shopId: req.params.shopId,
        userId: req.user?.userId,
      });
      next(err);
    }
  }
);
