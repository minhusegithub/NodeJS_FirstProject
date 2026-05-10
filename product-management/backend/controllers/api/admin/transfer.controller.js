import { Op } from 'sequelize';
import {
    sequelize,
    TransferSuggestion,
    InventoryTransferRequest,
    InventoryTransferItem,
    ProductStoreInventory,
    StockMovement,
    Store,
    Product,
    User
} from '../../../models/sequelize/index.js';
import { runTransferScan } from '../../../services/transferEngine.service.js';

// ─── Helper: Sinh mã phiếu TRF-YYYYMMDD-XXXX ─────────────────────────────
const generateTransferCode = async () => {
    const now = new Date();
    const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const dateStr = vn.toISOString().slice(0, 10).replace(/-/g, '');

    // Tìm số thứ tự lớn nhất trong ngày hôm nay
    const prefix = `TRF-${dateStr}-`;
    const last = await InventoryTransferRequest.findOne({
        where: { transfer_code: { [Op.like]: `${prefix}%` } },
        order: [['transfer_code', 'DESC']]
    });

    let seq = 1;
    if (last) {
        const lastSeq = parseInt(last.transfer_code.split('-').pop(), 10);
        seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
};

// ─── Helper: Lấy danh sách store_id mà user có quyền ─────────────────────
const getAllowedStoreIds = (req) => {
    const userStoreRoles = req.user?.store_roles || [];
    // SystemAdmin (store_id = null) → null nghĩa là all stores
    const isSystemWide = userStoreRoles.some(r => r.store_id === null);
    if (isSystemWide) return null;
    return [...new Set(userStoreRoles.map(r => r.store_id).filter(Boolean))];
};

// ─── Helper: Tạo phiếu chuyển kho từ suggestion ──────────────────────────
const createTransferRequestFromSuggestion = async (suggestion, userId, transaction) => {
    const code = await generateTransferCode();

    const request = await InventoryTransferRequest.create({
        transfer_code: code,
        source_store_id: suggestion.source_store_id,
        dest_store_id: suggestion.dest_store_id,
        status: 'pending_approval',
        total_items: 1,
        total_quantity: suggestion.suggested_qty,
        estimated_cost: suggestion.estimated_cost,
        distance_km: suggestion.distance_km,
        note: `Tạo tự động từ đề xuất #${suggestion.id}`,
        suggestion_id: suggestion.id,
        created_by: userId
    }, { transaction });

    await InventoryTransferItem.create({
        transfer_request_id: request.id,
        product_id: suggestion.product_id,
        quantity: suggestion.suggested_qty,
        received_quantity: 0
    }, { transaction });

    // Cập nhật suggestion
    await suggestion.update({
        status: 'approved',
        reviewed_by: userId,
        reviewed_at: new Date(),
        transfer_request_id: request.id
    }, { transaction });

    return request;
};

// ═══════════════════════════════════════════════════════════════════════════
// SUGGESTIONS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// [POST] /api/v1/admin/transfer/suggestions/scan
// Kích hoạt thuật toán MFTS, tạo đề xuất mới
export const scanSuggestions = async (req, res) => {
    try {
        const allowedStoreIds = getAllowedStoreIds(req);

        const result = await runTransferScan({ allowedStoreIds });

        res.json({
            code: 200,
            message: 'Quét đề xuất hoàn tất',
            data: result
        });
    } catch (error) {
        console.error('[Transfer] Scan Error:', error);
        res.status(500).json({ code: 500, message: 'Internal Server Error', error: error.message });
    }
};

// [GET] /api/v1/admin/transfer/suggestions
// Danh sách đề xuất, filter theo store và status
export const getSuggestions = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            store_id,
            product_id
        } = req.query;

        const allowedStoreIds = getAllowedStoreIds(req);
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const where = {};

        // Filter theo status
        if (status) where.status = status;

        // Filter theo product
        if (product_id) where.product_id = parseInt(product_id);

        // Filter theo store: kết hợp điều kiện phân quyền + filter của client
        if (store_id) {
            const sid = parseInt(store_id);
            // Kiểm tra user có quyền với store này không
            if (allowedStoreIds !== null && !allowedStoreIds.includes(sid)) {
                return res.status(403).json({ code: 403, message: 'Bạn không có quyền xem store này' });
            }
            where[Op.or] = [
                { source_store_id: sid },
                { dest_store_id: sid }
            ];
        } else if (allowedStoreIds !== null) {
            // Giới hạn theo store của user
            where[Op.or] = [
                { source_store_id: { [Op.in]: allowedStoreIds } },
                { dest_store_id: { [Op.in]: allowedStoreIds } }
            ];
        }

        const { count, rows } = await TransferSuggestion.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset,
            order: [['mfts_score', 'DESC'], ['created_at', 'DESC']],
            include: [
                {
                    model: Store,
                    as: 'sourceStore',
                    attributes: ['id', 'code', 'name']
                },
                {
                    model: Store,
                    as: 'destStore',
                    attributes: ['id', 'code', 'name']
                },
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'title', 'sku', 'thumbnail']
                }
            ],
            distinct: true
        });

        res.json({
            code: 200,
            message: 'Success',
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('[Transfer] Get Suggestions Error:', error);
        res.status(500).json({ code: 500, message: 'Internal Server Error', error: error.message });
    }
};

// [PATCH] /api/v1/admin/transfer/suggestions/:id/approve
// Phê duyệt đề xuất theo logic AND 2 chiều:
//   - User bên nguồn bấm duyệt → ghi source_approved_by/at, status → source_approved
//   - User bên đích bấm duyệt  → ghi dest_approved_by/at,   status → dest_approved
//   - Khi CẢ 2 bên đã duyệt   → status → approved → tạo phiếu chuyển kho
export const approveSuggestion = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const suggestion = await TransferSuggestion.findByPk(id, { transaction });
        if (!suggestion) {
            await transaction.rollback();
            return res.status(404).json({ code: 404, message: 'Không tìm thấy đề xuất' });
        }

        // Không duyệt được nếu đã approved/rejected/expired
        if (['approved', 'rejected', 'expired'].includes(suggestion.status)) {
            await transaction.rollback();
            return res.status(400).json({
                code: 400,
                message: `Đề xuất đang ở trạng thái "${suggestion.status}", không thể thao tác`
            });
        }

        // Kiểm tra hạn
        if (new Date() > new Date(suggestion.expires_at)) {
            await suggestion.update({ status: 'expired' }, { transaction });
            await transaction.commit();
            return res.status(400).json({ code: 400, message: 'Đề xuất đã hết hạn' });
        }

        // Xác định user thuộc bên nào
        const allowedStoreIds = getAllowedStoreIds(req); // null = SystemAdmin (được duyệt cả 2)
        const isSystemAdmin   = allowedStoreIds === null;

        const isSourceSide = isSystemAdmin ||
            allowedStoreIds.includes(suggestion.source_store_id);
        const isDestSide   = isSystemAdmin ||
            allowedStoreIds.includes(suggestion.dest_store_id);

        if (!isSourceSide && !isDestSide) {
            await transaction.rollback();
            return res.status(403).json({
                code: 403,
                message: 'Bạn không có quyền duyệt đề xuất này'
            });
        }

        const now = new Date();
        const updates = {};

        // Ghi nhận phê duyệt theo từng bên
        if (isSourceSide && !suggestion.source_approved_at) {
            updates.source_approved_by = userId;
            updates.source_approved_at = now;
        }
        if (isDestSide && !suggestion.dest_approved_at) {
            updates.dest_approved_by = userId;
            updates.dest_approved_at = now;
        }

        if (Object.keys(updates).length === 0) {
            await transaction.rollback();
            return res.status(400).json({
                code: 400,
                message: 'Bạn đã phê duyệt phía này rồi, đang chờ bên còn lại'
            });
        }

        // Tính trạng thái mới sau khi ghi nhận
        const sourceApprovedAt = updates.source_approved_at ?? suggestion.source_approved_at;
        const destApprovedAt   = updates.dest_approved_at   ?? suggestion.dest_approved_at;

        const bothApproved = !!sourceApprovedAt && !!destApprovedAt;

        if (bothApproved) {
            // CẢ 2 ĐÃ DUYỆT → tạo phiếu chuyển kho
            updates.status      = 'approved';
            updates.reviewed_by = userId;
            updates.reviewed_at = now;

            await suggestion.update(updates, { transaction });

            const request = await createTransferRequestFromSuggestion(suggestion, userId, transaction);
            await transaction.commit();

            return res.json({
                code: 200,
                message: 'Cả 2 bên đã phê duyệt! Phiếu chuyển kho đã được tạo.',
                data: {
                    suggestion_id: suggestion.id,
                    transfer_request_id: request.id,
                    transfer_code: request.transfer_code,
                    both_approved: true
                }
            });
        } else {
            // Mới 1 bên duyệt → cập nhật status trung gian
            updates.status = sourceApprovedAt ? 'source_approved' : 'dest_approved';
            await suggestion.update(updates, { transaction });
            await transaction.commit();

            const waitingFor = sourceApprovedAt
                ? 'Đang chờ cửa hàng nhận hàng xác nhận'
                : 'Đang chờ cửa hàng giao hàng xác nhận';

            return res.json({
                code: 200,
                message: `Đã ghi nhận phê duyệt. ${waitingFor}.`,
                data: {
                    suggestion_id: suggestion.id,
                    status: updates.status,
                    both_approved: false,
                    source_approved: !!sourceApprovedAt,
                    dest_approved:   !!destApprovedAt
                }
            });
        }
    } catch (error) {
        await transaction.rollback();
        console.error('[Transfer] Approve Suggestion Error:', error);
        res.status(500).json({ code: 500, message: 'Internal Server Error', error: error.message });
    }
};

// [PATCH] /api/v1/admin/transfer/suggestions/:id/reject
// Từ chối đề xuất — cho phép từ chối ở bất kỳ trạng thái trung gian nào
// (pending, source_approved, dest_approved)
// Bất kỳ bên nào từ chối → toàn bộ đề xuất bị rejected
export const rejectSuggestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user.id;

        const suggestion = await TransferSuggestion.findByPk(id);
        if (!suggestion) {
            return res.status(404).json({ code: 404, message: 'Không tìm thấy đề xuất' });
        }

        // Chỉ cho phép từ chối ở các trạng thái CHƯA hoàn tất
        const rejectableStatuses = ['pending', 'source_approved', 'dest_approved'];
        if (!rejectableStatuses.includes(suggestion.status)) {
            return res.status(400).json({
                code: 400,
                message: `Đề xuất đang ở trạng thái "${suggestion.status}", không thể từ chối`
            });
        }

        // Kiểm tra user có quyền với ít nhất 1 trong 2 bên
        const allowedStoreIds = getAllowedStoreIds(req);
        if (allowedStoreIds !== null) {
            const canReject =
                allowedStoreIds.includes(suggestion.source_store_id) ||
                allowedStoreIds.includes(suggestion.dest_store_id);
            if (!canReject) {
                return res.status(403).json({
                    code: 403,
                    message: 'Bạn không có quyền từ chối đề xuất này'
                });
            }
        }

        await suggestion.update({
            status: 'rejected',
            reviewed_by: userId,
            reviewed_at: new Date(),
            ...(reason && { reason: `[TỪ CHỐI] ${reason}` })
        });

        res.json({ code: 200, message: 'Đã từ chối đề xuất', data: { id: suggestion.id } });
    } catch (error) {
        console.error('[Transfer] Reject Suggestion Error:', error);
        res.status(500).json({ code: 500, message: 'Internal Server Error', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// TRANSFER REQUESTS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// [GET] /api/v1/admin/transfer/requests
// Danh sách phiếu chuyển kho
export const getTransferRequests = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            store_id
        } = req.query;

        const allowedStoreIds = getAllowedStoreIds(req);
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (status) where.status = status;

        if (store_id) {
            const sid = parseInt(store_id);
            if (allowedStoreIds !== null && !allowedStoreIds.includes(sid)) {
                return res.status(403).json({ code: 403, message: 'Bạn không có quyền xem store này' });
            }
            where[Op.or] = [
                { source_store_id: sid },
                { dest_store_id: sid }
            ];
        } else if (allowedStoreIds !== null) {
            where[Op.or] = [
                { source_store_id: { [Op.in]: allowedStoreIds } },
                { dest_store_id: { [Op.in]: allowedStoreIds } }
            ];
        }

        const { count, rows } = await InventoryTransferRequest.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset,
            order: [['created_at', 'DESC']],
            include: [
                { model: Store, as: 'sourceStore', attributes: ['id', 'code', 'name'] },
                { model: Store, as: 'destStore', attributes: ['id', 'code', 'name'] },
                { model: User, as: 'creator', attributes: ['id', 'full_name'] },
                { model: User, as: 'approver', attributes: ['id', 'full_name'] }
            ],
            distinct: true
        });

        res.json({
            code: 200,
            message: 'Success',
            data: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('[Transfer] Get Requests Error:', error);
        res.status(500).json({ code: 500, message: 'Internal Server Error', error: error.message });
    }
};

// [GET] /api/v1/admin/transfer/requests/:id
// Chi tiết phiếu chuyển kho kèm danh sách sản phẩm
export const getTransferRequestDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const request = await InventoryTransferRequest.findByPk(id, {
            include: [
                { model: Store, as: 'sourceStore', attributes: ['id', 'code', 'name', 'address', 'latitude', 'longitude'] },
                { model: Store, as: 'destStore', attributes: ['id', 'code', 'name', 'address', 'latitude', 'longitude'] },
                { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] },
                { model: User, as: 'approver', attributes: ['id', 'full_name', 'email'] },
                {
                    model: InventoryTransferItem,
                    as: 'items',
                    include: [
                        { model: Product, as: 'product', attributes: ['id', 'title', 'sku', 'thumbnail', 'price'] }
                    ]
                },
                {
                    model: TransferSuggestion,
                    as: 'suggestion',
                    attributes: ['id', 'mfts_score', 'score_distance', 'score_surplus', 'score_cost', 'reason']
                }
            ]
        });

        if (!request) {
            return res.status(404).json({ code: 404, message: 'Không tìm thấy phiếu chuyển kho' });
        }

        res.json({ code: 200, message: 'Success', data: request });
    } catch (error) {
        console.error('[Transfer] Get Request Detail Error:', error);
        res.status(500).json({ code: 500, message: 'Internal Server Error', error: error.message });
    }
};

// [PATCH] /api/v1/admin/transfer/requests/:id/status
// Cập nhật trạng thái phiếu — xử lý trừ/cộng tồn kho và ghi StockMovement
export const updateTransferStatus = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { status, note, received_items } = req.body;
        const userId = req.user.id;

        // Các chuyển trạng thái hợp lệ
        const VALID_TRANSITIONS = {
            draft: ['pending_approval', 'cancelled'],
            pending_approval: ['approved', 'cancelled'],
            approved: ['in_transit', 'cancelled'],
            in_transit: ['received'],
            received: ['completed']
        };

        const request = await InventoryTransferRequest.findByPk(id, {
            include: [{ model: InventoryTransferItem, as: 'items' }],
            transaction
        });

        if (!request) {
            await transaction.rollback();
            return res.status(404).json({ code: 404, message: 'Không tìm thấy phiếu chuyển kho' });
        }

        const allowed = VALID_TRANSITIONS[request.status] || [];
        if (!allowed.includes(status)) {
            await transaction.rollback();
            return res.status(400).json({
                code: 400,
                message: `Không thể chuyển từ "${request.status}" sang "${status}"`
            });
        }

        const updateData = { status };
        if (note) updateData.note = note;

        // ── Xuất kho → trừ stock nguồn ────────────────────────────────
        if (status === 'in_transit') {
            updateData.shipped_at = new Date();
            updateData.approved_by = userId;

            for (const item of request.items) {
                const inv = await ProductStoreInventory.findOne({
                    where: { store_id: request.source_store_id, product_id: item.product_id },
                    transaction
                });

                if (!inv || inv.stock < item.quantity) {
                    await transaction.rollback();
                    return res.status(400).json({
                        code: 400,
                        message: `Tồn kho nguồn không đủ cho sản phẩm ID ${item.product_id}`
                    });
                }

                await inv.update({ stock: inv.stock - item.quantity }, { transaction });

                await StockMovement.create({
                    product_id: item.product_id,
                    store_id: request.source_store_id,
                    movement_type: 'transfer_out',
                    quantity: -item.quantity,
                    reference_type: 'inventory_transfer',
                    reference_id: request.id,
                    note: `Xuất kho cho phiếu ${request.transfer_code}`,
                    created_by: userId
                }, { transaction });
            }
        }

        // ── Nhận hàng → cập nhật received_quantity ────────────────────
        if (status === 'received') {
            updateData.received_at = new Date();

            if (received_items?.length) {
                for (const ri of received_items) {
                    await InventoryTransferItem.update(
                        { received_quantity: ri.received_quantity, note: ri.note },
                        { where: { id: ri.id, transfer_request_id: request.id }, transaction }
                    );
                }
            }
        }

        // ── Hoàn tất → cộng stock đích ────────────────────────────────
        if (status === 'completed') {
            updateData.completed_at = new Date();

            // Reload items để có received_quantity mới nhất
            const freshItems = await InventoryTransferItem.findAll({
                where: { transfer_request_id: request.id },
                transaction
            });

            for (const item of freshItems) {
                const qtyReceived = item.received_quantity || item.quantity;

                const inv = await ProductStoreInventory.findOne({
                    where: { store_id: request.dest_store_id, product_id: item.product_id },
                    transaction
                });

                if (inv) {
                    await inv.update({ stock: inv.stock + qtyReceived, last_restock_date: new Date() }, { transaction });
                } else {
                    // Cửa hàng đích chưa có bản ghi inventory → tạo mới
                    await ProductStoreInventory.create({
                        store_id: request.dest_store_id,
                        product_id: item.product_id,
                        stock: qtyReceived,
                        status: 'active',
                        last_restock_date: new Date()
                    }, { transaction });
                }

                await StockMovement.create({
                    product_id: item.product_id,
                    store_id: request.dest_store_id,
                    movement_type: 'transfer_in',
                    quantity: qtyReceived,
                    reference_type: 'inventory_transfer',
                    reference_id: request.id,
                    note: `Nhận hàng từ phiếu ${request.transfer_code}`,
                    created_by: userId
                }, { transaction });
            }
        }

        await request.update(updateData, { transaction });
        await transaction.commit();

        res.json({
            code: 200,
            message: `Cập nhật trạng thái phiếu thành công: ${status}`,
            data: { id: request.id, transfer_code: request.transfer_code, status }
        });
    } catch (error) {
        await transaction.rollback();
        console.error('[Transfer] Update Status Error:', error);
        res.status(500).json({ code: 500, message: 'Internal Server Error', error: error.message });
    }
};

// [POST] /api/v1/admin/transfer/requests
// Tạo phiếu chuyển kho thủ công (không qua suggestion)
export const createManualTransferRequest = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { source_store_id, dest_store_id, items, note } = req.body;
        const userId = req.user.id;

        // Validation cơ bản
        if (!source_store_id || !dest_store_id || !items?.length) {
            await transaction.rollback();
            return res.status(400).json({
                code: 400,
                message: 'Thiếu thông tin: source_store_id, dest_store_id, items là bắt buộc'
            });
        }

        if (source_store_id === dest_store_id) {
            await transaction.rollback();
            return res.status(400).json({ code: 400, message: 'Cửa hàng nguồn và đích không được trùng nhau' });
        }

        // Kiểm tra store tồn tại
        const [sourceStore, destStore] = await Promise.all([
            Store.findByPk(source_store_id, { transaction }),
            Store.findByPk(dest_store_id, { transaction })
        ]);

        if (!sourceStore) {
            await transaction.rollback();
            return res.status(404).json({ code: 404, message: `Không tìm thấy cửa hàng nguồn ID ${source_store_id}` });
        }
        if (!destStore) {
            await transaction.rollback();
            return res.status(404).json({ code: 404, message: `Không tìm thấy cửa hàng đích ID ${dest_store_id}` });
        }

        const code = await generateTransferCode();
        const totalQuantity = items.reduce((sum, i) => sum + (i.quantity || 0), 0);

        const request = await InventoryTransferRequest.create({
            transfer_code: code,
            source_store_id,
            dest_store_id,
            status: 'pending_approval',
            total_items: items.length,
            total_quantity: totalQuantity,
            note,
            created_by: userId
        }, { transaction });

        await InventoryTransferItem.bulkCreate(
            items.map(i => ({
                transfer_request_id: request.id,
                product_id: i.product_id,
                quantity: i.quantity,
                received_quantity: 0,
                note: i.note
            })),
            { transaction }
        );

        await transaction.commit();

        res.status(201).json({
            code: 201,
            message: 'Tạo phiếu chuyển kho thủ công thành công',
            data: { id: request.id, transfer_code: request.transfer_code }
        });
    } catch (error) {
        await transaction.rollback();
        console.error('[Transfer] Create Manual Request Error:', error);
        res.status(500).json({ code: 500, message: 'Internal Server Error', error: error.message });
    }
};
