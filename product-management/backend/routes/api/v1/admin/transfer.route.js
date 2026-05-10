import express from 'express';
import * as controller from '../../../../controllers/api/admin/transfer.controller.js';
import { requireRole } from '../../../../middlewares/role.middleware.js';

const router = express.Router();

// Các role được phép dùng tính năng này
const MANAGER_ROLES    = ['storeManager'];
const STAFF_ROLES      = ['storeManager', 'inventoryStaff'];

// ─── Suggestions ──────────────────────────────────────────────────────────

// POST /api/v1/admin/transfer/suggestions/scan
// Kích hoạt thuật toán MFTS (storeManager và inventoryStaff)
router.post('/suggestions/scan', requireRole(STAFF_ROLES), controller.scanSuggestions);

// GET /api/v1/admin/transfer/suggestions
// Danh sách đề xuất (storeManager và inventoryStaff)
router.get('/suggestions', requireRole(STAFF_ROLES), controller.getSuggestions);

// PATCH /api/v1/admin/transfer/suggestions/:id/approve
// Phê duyệt đề xuất → tạo phiếu chuyển kho (chỉ storeManager)
router.patch('/suggestions/:id/approve', requireRole(MANAGER_ROLES), controller.approveSuggestion);

// PATCH /api/v1/admin/transfer/suggestions/:id/reject
// Từ chối đề xuất (chỉ storeManager)
router.patch('/suggestions/:id/reject', requireRole(MANAGER_ROLES), controller.rejectSuggestion);

// ─── Transfer Requests ────────────────────────────────────────────────────

// GET /api/v1/admin/transfer/requests
// Danh sách phiếu chuyển kho
router.get('/requests', requireRole(STAFF_ROLES), controller.getTransferRequests);

// GET /api/v1/admin/transfer/requests/:id
// Chi tiết 1 phiếu chuyển kho
router.get('/requests/:id', requireRole(STAFF_ROLES), controller.getTransferRequestDetail);

// PATCH /api/v1/admin/transfer/requests/:id/status
// Cập nhật trạng thái phiếu (vận chuyển, nhận hàng, hoàn tất...)
router.patch('/requests/:id/status', requireRole(STAFF_ROLES), controller.updateTransferStatus);

// POST /api/v1/admin/transfer/requests
// Tạo phiếu chuyển kho thủ công (chỉ storeManager)
router.post('/requests', requireRole(MANAGER_ROLES), controller.createManualTransferRequest);

export default router;
