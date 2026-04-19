/**
 * GET /api/v1/shops/:shopId/statement/pdf?month=4&year=2026
 * Generate and return a monthly statement PDF
 * Requires: Authentication + shop_owner role + ownership of shop
 * Dependencies: pdfkit (npm install pdfkit)
 */

import { Router } from 'express';
import Joi from 'joi';
import PDFDocument from 'pdfkit';
import logger from '../utils/logger.js';
import { errorResponse } from '../utils/response.js';
import { authenticate } from '../middleware/auth.js';
import { roleGuard, shopOwnerGuard } from '../middleware/roleGuard.js';
import { supabase } from '../services/supabase.js';
import { AppError, INTERNAL_ERROR } from '../utils/errors.js';

const router = Router();

const querySchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number().integer().min(2020).required(),
});

/**
 * Helper: Format currency as ₹ with commas
 */
function formatCurrency(paise) {
  const rupees = Math.floor(paise / 100);
  return `₹${rupees.toLocaleString('en-IN')}`;
}

/**
 * Helper: Get date range for month
 */
function getMonthDateRange(month, year) {
  const startDate = new Date(`${year}-${String(month).padStart(2, '0')}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);
  endDate.setDate(0); // Last day of month

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

/**
 * GET /api/v1/shops/:shopId/statement/pdf
 * Generate monthly statement PDF
 */
router.get(
  '/:shopId/statement/pdf',
  authenticate,
  roleGuard(['shop_owner']),
  shopOwnerGuard(),
  async (req, res, next) => {
    let doc = null;
    try {
      const { shopId } = req.params;
      const { error: validationError, value } = querySchema.validate(req.query);

      if (validationError) {
        return res.status(400).json(
          errorResponse('VALIDATION_ERROR', validationError.details[0].message)
        );
      }

      const { month, year } = value;

      logger.info('Generate statement PDF endpoint called', {
        shopId,
        userId: req.user.userId,
        month,
        year,
      });

      // 1. Validate month/year not in future
      const now = new Date();
      const statementDate = new Date(`${year}-${String(month).padStart(2, '0')}-01`);
      if (statementDate > now) {
        return res.status(400).json(
          errorResponse('INVALID_DATE', 'Cannot generate statement for future month')
        );
      }

      // 2. Get date range
      const { startDate, endDate } = getMonthDateRange(month, year);

      // 3. Fetch shop details
      const { data: shop, error: shopError } = await supabase
        .from('shops')
        .select('id, shop_name, phone, city')
        .eq('id', shopId)
        .single();

      if (shopError || !shop) {
        logger.error('Failed to fetch shop', { shopId, error: shopError?.message });
        throw new AppError(INTERNAL_ERROR, 'Shop not found', 404);
      }

      // 4. Fetch analytics data for the month
      const { data: analytics, error: analyticsError } = await supabase
        .from('shop_analytics')
        .select(
          'date, gross_revenue_paise, net_revenue_paise, ' +
          'total_orders, completed_orders, commission_paise'
        )
        .eq('shop_id', shopId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (analyticsError) {
        logger.error('Failed to fetch analytics', {
          shopId,
          error: analyticsError.message,
        });
        throw new AppError(INTERNAL_ERROR, 'Failed to fetch analytics', 500);
      }

      // 5. Calculate totals
      const totalGrossRevenue = (analytics || []).reduce(
        (sum, a) => sum + (a.gross_revenue_paise || 0),
        0
      );
      const totalNetRevenue = (analytics || []).reduce(
        (sum, a) => sum + (a.net_revenue_paise || 0),
        0
      );
      const totalCommission = totalGrossRevenue - totalNetRevenue;
      const totalOrders = (analytics || []).reduce(
        (sum, a) => sum + (a.total_orders || 0),
        0
      );

      // 6. Generate PDF
      doc = new PDFDocument({
        size: 'A4',
        margin: 40,
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="statement-${shopId}-${year}-${String(month).padStart(2, '0')}.pdf"`
      );

      doc.pipe(res);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('NearBy', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('Monthly Statement', { align: 'center' });
      doc.moveDown(0.5);

      // Shop info
      doc.fontSize(11).font('Helvetica-Bold').text(shop.shop_name);
      doc.fontSize(9).font('Helvetica').text(`Phone: ${shop.phone}`);
      doc.text(`City: ${shop.city}`);
      doc.moveDown(1);

      // Period
      const monthName = new Date(year, month - 1, 1).toLocaleString('en-IN', {
        month: 'long',
        year: 'numeric',
      });
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`Statement Period: ${monthName}`);
      doc
        .fontSize(9)
        .font('Helvetica')
        .text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`);
      doc.moveDown(1);

      // Summary section
      doc.fontSize(12).font('Helvetica-Bold').text('Summary');
      doc.moveTo(40, doc.y).lineTo(540, doc.y).stroke();
      doc.moveDown(0.5);

      const summaryItems = [
        [`Gross Revenue (₹):`, formatCurrency(totalGrossRevenue)],
        [`Commission (₹):`, formatCurrency(totalCommission)],
        [`Net Earnings (₹):`, formatCurrency(totalNetRevenue)],
        [`Total Orders:`, totalOrders.toString()],
      ];

      summaryItems.forEach(([label, value]) => {
        doc.fontSize(10).font('Helvetica').text(label, { width: 250 });
        doc.fontSize(10).font('Helvetica-Bold').text(value, 280, doc.y - 14);
        doc.moveDown(0.8);
      });

      doc.moveDown(0.5);

      // Daily breakdown table
      if ((analytics || []).length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('Daily Breakdown');
        doc.moveTo(40, doc.y).lineTo(540, doc.y).stroke();
        doc.moveDown(0.3);

        // Table headers
        const headerY = doc.y;
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Date', 50, headerY);
        doc.text('Orders', 150, headerY);
        doc.text('Gross Revenue', 220, headerY);
        doc.text('Net Earnings', 380, headerY);
        doc.moveDown(0.8);

        // Table rows
        doc.font('Helvetica');
        doc.fontSize(9);
        (analytics || []).slice(0, 20).forEach((row) => {
          const rowY = doc.y;
          const dateStr = new Date(`${row.date}T00:00:00Z`).toLocaleDateString(
            'en-IN'
          );
          doc.text(dateStr, 50, rowY);
          doc.text((row.total_orders || 0).toString(), 150, rowY);
          doc.text(formatCurrency(row.gross_revenue_paise || 0), 220, rowY);
          doc.text(formatCurrency(row.net_revenue_paise || 0), 380, rowY);
          doc.moveDown(0.6);
        });

        if ((analytics || []).length > 20) {
          doc.fontSize(8).text('... and more records', { italics: true });
          doc.moveDown(0.5);
        }
      }

      doc.moveDown(1);

      // Footer
      doc
        .fontSize(8)
        .font('Helvetica')
        .text('This is an auto-generated statement from NearBy platform.', {
          align: 'center',
        });
      doc.text('For support, contact: support@nearby.app', { align: 'center' });

      // Finalize PDF
      doc.end();

      logger.info('Statement PDF generated successfully', {
        shopId,
        userId: req.user.userId,
        month,
        year,
      });
    } catch (err) {
      if (doc) {
        doc.end();
      }

      logger.error('Generate statement PDF error', {
        error: err.message,
        shopId: req.params.shopId,
        userId: req.user?.userId,
      });
      next(err);
    }
  }
);

export default router;
