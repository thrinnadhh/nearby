/**
 * Backend shop settings endpoints snippet
 * GET /api/v1/shops/:shopId/settings - Fetch settings
 * PATCH /api/v1/shops/:shopId/settings - Update settings
 * 
 * To add to backend/src/routes/shops.js after toggle and holiday endpoints:
 */

/**
 * GET /api/v1/shops/:shopId/settings
 * Retrieve shop settings (hours, radius, bank details, description)
 */
router.get(
  '/:shopId/settings',
  authenticate,
  roleGuard(['shop_owner']),
  shopOwnerGuard(),
  async (req, res, next) => {
    try {
      const { shopId } = req.params;

      const { data: shop, error } = await supabase
        .from('shops')
        .select(
          'operating_hours, delivery_radius_km, bank_account_number, ' +
          'bank_ifsc, bank_account_name, shop_description'
        )
        .eq('id', shopId)
        .single();

      if (error) {
        throw new AppError(INTERNAL_ERROR, 'Failed to fetch settings', 500);
      }

      if (!shop) {
        return res.status(404).json(
          errorResponse('SHOP_NOT_FOUND', 'Shop not found')
        );
      }

      logger.info('Get shop settings endpoint success', {
        shopId,
        userId: req.user.userId,
      });

      res.status(200).json(
        successResponse({
          hours: shop.operating_hours || [],
          deliveryRadiusKm: shop.delivery_radius_km || 3,
          bankAccountNumber: shop.bank_account_number || '',
          bankIfsc: shop.bank_ifsc || '',
          bankAccountName: shop.bank_account_name || '',
          description: shop.shop_description || '',
        })
      );
    } catch (err) {
      logger.error('Get shop settings endpoint error', {
        error: err.message,
        shopId: req.params.shopId,
        userId: req.user?.userId,
      });
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/shops/:shopId/settings
 * Update shop settings with validation
 */
router.patch(
  '/:shopId/settings',
  authenticate,
  roleGuard(['shop_owner']),
  shopOwnerGuard(),
  async (req, res, next) => {
    try {
      const { shopId } = req.params;
      const {
        hours,
        deliveryRadiusKm,
        bankAccountNumber,
        bankIfsc,
        bankAccountName,
        description,
      } = req.body;

      // 1. Validate deliveryRadiusKm
      if (deliveryRadiusKm !== undefined) {
        if (deliveryRadiusKm < 1 || deliveryRadiusKm > 10) {
          return res.status(400).json(
            errorResponse(
              'INVALID_RADIUS',
              'Delivery radius must be between 1 and 10 km'
            )
          );
        }
      }

      // 2. Validate bank fields
      if (bankAccountNumber !== undefined) {
        if (bankAccountNumber.length < 9 || bankAccountNumber.length > 18) {
          return res.status(400).json(
            errorResponse(
              'INVALID_ACCOUNT_NUMBER',
              'Account number must be 9-18 digits'
            )
          );
        }
      }

      if (bankIfsc !== undefined) {
        if (bankIfsc.length !== 11) {
          return res.status(400).json(
            errorResponse('INVALID_IFSC', 'IFSC code must be 11 characters')
          );
        }
      }

      // 3. Validate description
      if (description !== undefined) {
        if (description.length > 500) {
          return res.status(400).json(
            errorResponse(
              'DESCRIPTION_TOO_LONG',
              'Description must be 500 characters or less'
            )
          );
        }
      }

      // 4. Update shop
      const updateData = {};
      if (hours !== undefined) updateData.operating_hours = hours;
      if (deliveryRadiusKm !== undefined)
        updateData.delivery_radius_km = deliveryRadiusKm;
      if (bankAccountNumber !== undefined)
        updateData.bank_account_number = bankAccountNumber;
      if (bankIfsc !== undefined) updateData.bank_ifsc = bankIfsc;
      if (bankAccountName !== undefined)
        updateData.bank_account_name = bankAccountName;
      if (description !== undefined) updateData.shop_description = description;

      updateData.updated_at = new Date().toISOString();

      const { data: shop, error } = await supabase
        .from('shops')
        .update(updateData)
        .eq('id', shopId)
        .eq('owner_id', req.user.userId)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update shop settings', {
          shopId,
          error: error.message,
        });
        throw new AppError(INTERNAL_ERROR, 'Failed to update settings', 500);
      }

      if (!shop) {
        return res.status(404).json(
          errorResponse('SHOP_NOT_FOUND', 'Shop not found')
        );
      }

      logger.info('Update shop settings endpoint success', {
        shopId,
        userId: req.user.userId,
        updatedFields: Object.keys(updateData),
      });

      res.status(200).json(
        successResponse({
          hours: shop.operating_hours || [],
          deliveryRadiusKm: shop.delivery_radius_km || 3,
          bankAccountNumber: shop.bank_account_number || '',
          bankIfsc: shop.bank_ifsc || '',
          bankAccountName: shop.bank_account_name || '',
          description: shop.shop_description || '',
          updatedAt: shop.updated_at,
        })
      );
    } catch (err) {
      logger.error('Update shop settings endpoint error', {
        error: err.message,
        shopId: req.params.shopId,
        userId: req.user?.userId,
      });
      next(err);
    }
  }
);
