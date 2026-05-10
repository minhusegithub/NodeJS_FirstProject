/**
 * Transfer Engine Service — Multi-Factor Transfer Scoring (MFTS)
 *
 * 5 bước:
 *   1. Demand Detection  : Tìm cửa hàng có stock ≤ REORDER_POINT
 *   2. Supply Discovery  : Tìm cửa hàng có stock > REORDER_POINT × 2
 *   3. MFTS Scoring      : Chấm điểm mỗi cặp (source, dest, product)
 *                          Score = 0.40·S_distance + 0.35·S_surplus + 0.25·S_urgency
 *                          (S_urgency = mức khẩn cấp của đích = (RP - dest_stock)/RP)
 *   4. Greedy Allocation : Phân bổ số lượng theo thứ tự score giảm dần
 *   5. Persist           : Lưu đề xuất vào transfer_suggestions, mark expired cũ
 */

import cron from 'node-cron';
import { QueryTypes } from 'sequelize';
import {
    sequelize,
    TransferSuggestion
} from '../models/sequelize/index.js';
import { haversine, estimateTransferCost } from '../helpers/haversine.js';

// ─── Tham số thuật toán ────────────────────────────────────────────────────
const LEAD_TIME_DAYS = 2;    // Số ngày vận chuyển ước tính
const SAFETY_FACTOR = 1.5;  // Hệ số an toàn tồn kho
const MAX_TRANSFER_BATCH = 500; // Giới hạn tối đa số lượng mỗi lần chuyển
const SUGGESTION_TTL_HOURS = 48; // Đề xuất hết hạn sau N giờ

// Trọng số MFTS (tổng = 1.0)
const W_DISTANCE = 0.40;
const W_SURPLUS = 0.35;
// S_urgency thay thế S_cost vì cost là hàm tuyến tính của distance → không mang thêm thông tin
// S_urgency = (reorder_point - dest_stock) / reorder_point → đo mức khẩn cấp thực sự của đích
const W_URGENCY = 0.25;

// ─── Helper: tính REORDER_POINT ───────────────────────────────────────────
const calcReorderPoint = (velocity) => {
    // velocity: sp bán được trong 30 ngày
    const dailyRate = velocity / 30;
    return Math.ceil(dailyRate * LEAD_TIME_DAYS * SAFETY_FACTOR);
};

// ─── Helper: sinh lý do tiếng Việt ───────────────────────────────────────
const buildReason = ({ destStoreName, sourceStoreName, productTitle, destStock, reorderPoint, sourceStock, transferableQty, distanceKm, score }) => {
    return (
        `Cửa hàng "${destStoreName}" đang có tồn kho ${destStock} SP ` +
        `(ngưỡng an toàn: ${reorderPoint} SP). ` +
        `Cửa hàng "${sourceStoreName}" có ${sourceStock} SP dư thừa ` +
        `(có thể chuyển ${transferableQty} SP). ` +
        `Khoảng cách: ${distanceKm.toFixed(1)} km. ` +
        `Điểm MFTS: ${score.toFixed(4)}.`
    );
};

// ─── Bước 1: Demand Detection ─────────────────────────────────────────────
/**
 * Tìm tất cả (store, product) có stock ≤ REORDER_POINT
 * Dùng velocity từ dsi_reports để tính REORDER_POINT động.
 * Nếu không có DSI data → coi velocity = 0 → fallback reorderPoint = 1
 *
 * @param {number[]|null} allowedStoreIds - Giới hạn theo danh sách store (null = all)
 * @returns {Array} demandItems: [{ store_id, product_id, stock, velocity, reorder_point, qty_needed, store }]
 */
const detectDemands = async (allowedStoreIds = null) => {
    const storeFilter = allowedStoreIds?.length
        ? `AND psi.store_id = ANY(ARRAY[${allowedStoreIds.map(Number).join(',')}])`
        : '';

    const rows = await sequelize.query(`
        SELECT
            psi.store_id,
            psi.product_id,
            psi.stock,
            COALESCE(d.velocity, 0)                         AS velocity,
            s.name                                          AS store_name,
            s.latitude,
            s.longitude,
            p.title                                         AS product_title
        FROM product_store_inventory psi
        INNER JOIN stores   s ON s.id = psi.store_id  AND s.is_active = TRUE
        INNER JOIN products p ON p.id = psi.product_id AND p.deleted_at IS NULL
        LEFT  JOIN dsi_reports d
               ON d.store_id = psi.store_id AND d.product_id = psi.product_id
        WHERE psi.status = 'active'
          ${storeFilter}
    `, { type: QueryTypes.SELECT });

    const demands = [];
    for (const row of rows) {
        const velocity = Number(row.velocity) || 0;
        const reorderPoint = Math.max(calcReorderPoint(velocity), 1);

        if (row.stock <= reorderPoint) {
            const qtyNeeded = reorderPoint * 2 - row.stock;
            demands.push({
                store_id: row.store_id,
                product_id: row.product_id,
                stock: row.stock,
                velocity,
                reorder_point: reorderPoint,
                qty_needed: Math.max(qtyNeeded, 1),
                store_name: row.store_name,
                latitude: parseFloat(row.latitude),
                longitude: parseFloat(row.longitude),
                product_title: row.product_title
            });
        }
    }

    return demands;
};

// ─── Bước 2: Supply Discovery ─────────────────────────────────────────────
/**
 * Với mỗi product_id cần luân chuyển, tìm cửa hàng có tồn kho dư thừa.
 * Điều kiện: stock > REORDER_POINT × 2
 * transferable_qty = stock - REORDER_POINT × SAFETY_FACTOR
 *
 * @param {number[]} productIds - Danh sách product cần tìm nguồn
 * @param {number[]} demandStoreIds - Loại trừ các cửa hàng đang cần hàng
 * @returns {Map<number, Array>} Map: product_id → [{store_id, stock, transferable_qty, store_name, lat, lng}]
 */
const discoverSupply = async (productIds, demandStoreIds) => {
    if (!productIds.length) return new Map();

    const excludeFilter = demandStoreIds.length
        ? `AND psi.store_id NOT IN (${demandStoreIds.map(Number).join(',')})`
        : '';

    const rows = await sequelize.query(`
        SELECT
            psi.store_id,
            psi.product_id,
            psi.stock,
            COALESCE(d.velocity, 0) AS velocity,
            s.name                  AS store_name,
            s.latitude,
            s.longitude
        FROM product_store_inventory psi
        INNER JOIN stores s ON s.id = psi.store_id AND s.is_active = TRUE
        LEFT  JOIN dsi_reports d
               ON d.store_id = psi.store_id AND d.product_id = psi.product_id
        WHERE psi.status = 'active'
          AND psi.product_id = ANY(ARRAY[${productIds.map(Number).join(',')}])
          ${excludeFilter}
    `, { type: QueryTypes.SELECT });

    const supplyMap = new Map(); // product_id → candidates[]

    for (const row of rows) {
        const velocity = Number(row.velocity) || 0;
        const reorderPoint = Math.max(calcReorderPoint(velocity), 1);
        const threshold = reorderPoint * 2;

        if (row.stock <= threshold) continue; // không đủ dư

        const transferableQty = Math.floor(row.stock - reorderPoint * SAFETY_FACTOR);
        if (transferableQty <= 0) continue;

        const pid = row.product_id;
        if (!supplyMap.has(pid)) supplyMap.set(pid, []);

        supplyMap.get(pid).push({
            store_id: row.store_id,
            product_id: pid,
            stock: row.stock,
            transferable_qty: transferableQty,
            store_name: row.store_name,
            latitude: parseFloat(row.latitude),
            longitude: parseFloat(row.longitude)
        });
    }

    return supplyMap;
};

// ─── Bước 3: MFTS Scoring ────────────────────────────────────────────────
/**
 * Chấm điểm từng cặp (source_store, dest_store, product).
 * Score = W_DISTANCE·S_dist + W_SURPLUS·S_surplus + W_COST·S_cost
 * Tất cả sub-scores được chuẩn hoá về [0, 1].
 *
 * @param {Array} demands    - Output từ detectDemands()
 * @param {Map}   supplyMap  - Output từ discoverSupply()
 * @returns {Array} candidates: [{ demand, supply, distance_km, estimated_cost, score, score_distance, score_surplus, score_urgency }]
 */
const scoreCandidates = (demands, supplyMap) => {
    const raw = []; // Thu thập tất cả cặp hợp lệ trước khi chuẩn hoá

    for (const demand of demands) {
        const sources = supplyMap.get(demand.product_id);
        if (!sources?.length) continue;

        for (const source of sources) {
            // Bỏ qua nếu cùng cửa hàng
            if (source.store_id === demand.store_id) continue;

            // Tính khoảng cách Haversine
            let distKm = 0;
            const hasCoords =
                source.latitude && source.longitude &&
                demand.latitude && demand.longitude;

            if (hasCoords) {
                distKm = haversine(
                    source.latitude, source.longitude,
                    demand.latitude, demand.longitude
                );
            }

            // S_urgency: mức khẩn cấp của đích = (RP - stock) / RP
            // Đích càng sắp hết hàng (stock << RP) → S_urgency càng cao
            const S_urgency = demand.reorder_point > 0
                ? Math.max(0, (demand.reorder_point - demand.stock) / demand.reorder_point)
                : 0;

            raw.push({
                demand,
                source,
                distance_km: distKm,
                estimated_cost: estimateTransferCost(distKm),
                S_urgency
            });
        }
    }

    if (!raw.length) return [];

    // Chuẩn hoá các nhân tố phụ thuộc tập dữ liệu về [0,1]
    // S_urgency đã nằm trong [0,1] tự nhiên nên không cần chuẩn hoá
    const maxDist = Math.max(...raw.map(r => r.distance_km), 1);
    const maxTransferable = Math.max(...raw.map(r => r.source.transferable_qty), 1);

    return raw.map(r => {
        const S_distance = 1 - (r.distance_km / maxDist);
        const S_surplus = r.source.transferable_qty / maxTransferable;
        const S_urgency = r.S_urgency; // đã tính sẵn, range [0,1]

        const score = W_DISTANCE * S_distance + W_SURPLUS * S_surplus + W_URGENCY * S_urgency;

        return {
            ...r,
            score: parseFloat(score.toFixed(4)),
            score_distance: parseFloat(S_distance.toFixed(4)),
            score_surplus: parseFloat(S_surplus.toFixed(4)),
            score_urgency: parseFloat(S_urgency.toFixed(4))
        };
    });
};

// ─── Bước 4: Greedy Allocation ───────────────────────────────────────────
/**
 * Phân bổ số lượng thực tế theo thuật toán Greedy:
 *   - Sắp xếp theo score DESC
 *   - Lấy min(available_supply, remaining_demand, MAX_TRANSFER_BATCH)
 *   - Cập nhật available_supply và remaining_demand sau mỗi lần phân bổ
 *
 * @param {Array} scoredCandidates - Output từ scoreCandidates(), đã có .score
 * @returns {Array} allocations: [{ ...candidate, actual_qty }]
 */
const greedyAllocate = (scoredCandidates) => {
    // Sort DESC by score
    const sorted = [...scoredCandidates].sort((a, b) => b.score - a.score);

    // Tracking maps: key = "storeId_productId"
    const availableSupply = new Map(); // Tồn kho có thể chuyển của nguồn
    const remainingDemand = new Map(); // Nhu cầu còn lại của đích

    // Khởi tạo từ dữ liệu ban đầu
    for (const c of sorted) {
        const supplyKey = `${c.source.store_id}_${c.demand.product_id}`;
        const demandKey = `${c.demand.store_id}_${c.demand.product_id}`;

        if (!availableSupply.has(supplyKey)) {
            availableSupply.set(supplyKey, c.source.transferable_qty);
        }
        if (!remainingDemand.has(demandKey)) {
            remainingDemand.set(demandKey, c.demand.qty_needed);
        }
    }

    const allocations = [];

    for (const candidate of sorted) {
        const supplyKey = `${candidate.source.store_id}_${candidate.demand.product_id}`;
        const demandKey = `${candidate.demand.store_id}_${candidate.demand.product_id}`;

        const avail = availableSupply.get(supplyKey) || 0;
        const remaining = remainingDemand.get(demandKey) || 0;

        if (avail <= 0 || remaining <= 0) continue;

        const actualQty = Math.min(avail, remaining, MAX_TRANSFER_BATCH);
        if (actualQty <= 0) continue;

        allocations.push({ ...candidate, actual_qty: actualQty });

        availableSupply.set(supplyKey, avail - actualQty);
        remainingDemand.set(demandKey, remaining - actualQty);
    }

    return allocations;
};

// ─── Bước 5: Persist Suggestions ─────────────────────────────────────────
/**
 * Lưu allocations vào bảng transfer_suggestions theo chiến lược REUSE:
 *
 * Mỗi bộ ba (source_store_id, dest_store_id, product_id) chỉ được có
 * TỐI ĐA 1 bản ghi "có thể tái sử dụng" (pending hoặc expired).
 * Bản ghi approved/rejected KHÔNG bao giờ bị sửa — chúng là lịch sử.
 *
 * Expire stale — chỉ expire bản ghi khi TẤT CẢ điều kiện sau đúng:
 *   1. Dest_store của bản ghi đó NẰM TRONG tập demand stores lần quét này
 *      (tức là chúng ta đã đánh giá lại cửa hàng đích đó)
 *   2. Product_id NẰM TRONG tập sản phẩm được đánh giá
 *   3. Bản ghi KHÔNG xuất hiện trong kết quả allocation mới
 *
 *   → Bản ghi ngoài scope quét hiện tại KHÔNG bị đụng vào.
 *
 * @param {Array} allocations     - Output từ greedyAllocate()
 * @param {Array} demands         - Output từ detectDemands() — xác định scope
 * @param {object} transaction    - Sequelize transaction
 * @returns {number} Số đề xuất đã xử lý (insert + update)
 */
const persistSuggestions = async (allocations, demands, transaction) => {
    if (!allocations.length && !demands.length) return 0;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + SUGGESTION_TTL_HOURS * 60 * 60 * 1000);

    // Scope của lần quét này:
    //   evaluatedDemandKeys = Set của "destStoreId_productId" đã được thuật toán đánh giá
    //   Chỉ những bản ghi có (dest_store, product) trong tập này mới có thể bị expire
    const evaluatedDemandKeys = new Set(
        demands.map(d => `${d.store_id}_${d.product_id}`)
    );

    // 1. Lấy tất cả bản ghi CÓ THỂ TÁI SỬ DỤNG (pending hoặc expired)
    //    approved/rejected là lịch sử → KHÔNG đụng vào
    const reusableRows = await sequelize.query(`
        SELECT id, source_store_id, dest_store_id, product_id, status
        FROM transfer_suggestions
        WHERE status IN ('pending', 'expired')
    `, { type: QueryTypes.SELECT, transaction });

    // Map: "sourceId_destId_productId" → id của bản ghi reusable
    // Nếu có cả pending lẫn expired cùng key → ưu tiên pending
    const reuseMap = new Map();
    for (const row of reusableRows.filter(r => r.status === 'expired')) {
        const key = `${row.source_store_id}_${row.dest_store_id}_${row.product_id}`;
        reuseMap.set(key, row.id);
    }
    for (const row of reusableRows.filter(r => r.status === 'pending')) {
        const key = `${row.source_store_id}_${row.dest_store_id}_${row.product_id}`;
        reuseMap.set(key, row.id);
    }

    // 2. Phân loại allocations: UPDATE (reuse) vs INSERT (hoàn toàn mới)
    const toUpdate = [];
    const toInsert = [];
    const activeKeys = new Set();

    for (const a of allocations) {
        const key = `${a.source.store_id}_${a.demand.store_id}_${a.demand.product_id}`;
        activeKeys.add(key);

        const reason = buildReason({
            destStoreName: a.demand.store_name,
            sourceStoreName: a.source.store_name,
            productTitle: a.demand.product_title,
            destStock: a.demand.stock,
            reorderPoint: a.demand.reorder_point,
            sourceStock: a.source.stock,
            transferableQty: a.source.transferable_qty,
            distanceKm: a.distance_km,
            score: a.score
        });

        const payload = {
            suggested_qty: a.actual_qty,
            mfts_score: a.score,
            score_distance: a.score_distance,
            score_surplus: a.score_surplus,
            score_cost: a.score_urgency,
            distance_km: parseFloat(a.distance_km.toFixed(2)),
            estimated_cost: parseFloat(a.estimated_cost.toFixed(2)),
            source_stock: a.source.stock,
            dest_stock: a.demand.stock,
            dest_velocity: a.demand.velocity,
            reason,
            expires_at: expiresAt,
            calculated_at: now
        };

        if (reuseMap.has(key)) {
            toUpdate.push({ id: reuseMap.get(key), ...payload, status: 'pending' });
        } else {
            toInsert.push({
                source_store_id: a.source.store_id,
                dest_store_id: a.demand.store_id,
                product_id: a.demand.product_id,
                status: 'pending',
                ...payload
            });
        }
    }

    // 3. UPDATE (reuse bản ghi cũ, kể cả expired → pending lại)
    for (const row of toUpdate) {
        await sequelize.query(`
            UPDATE transfer_suggestions SET
                status         = :status,
                suggested_qty  = :suggested_qty,
                mfts_score     = :mfts_score,
                score_distance = :score_distance,
                score_surplus  = :score_surplus,
                score_cost     = :score_cost,
                distance_km    = :distance_km,
                estimated_cost = :estimated_cost,
                source_stock   = :source_stock,
                dest_stock     = :dest_stock,
                dest_velocity  = :dest_velocity,
                reason         = :reason,
                expires_at     = :expires_at,
                calculated_at  = :calculated_at,
                updated_at     = NOW()
            WHERE id = :id
        `, { replacements: row, transaction });
    }

    // 4. INSERT hoàn toàn mới
    if (toInsert.length) {
        await TransferSuggestion.bulkCreate(toInsert, { transaction });
    }

    // 5. Expire stale — CHỈ trong phạm vi đã được đánh giá lần này
    //
    //    Điều kiện expire một bản ghi reusable:
    //      - Không nằm trong activeKeys (không có allocation cho nó)
    //      - dest_store + product của nó NẰM TRONG evaluatedDemandKeys
    //        (tức là chúng ta đã đánh giá lại dest đó và kết luận không cần)
    //
    //    Bản ghi của các cửa hàng NGOÀI scope quét → KHÔNG động đến
    const staleIds = [];
    for (const [key, id] of reuseMap.entries()) {
        if (activeKeys.has(key)) continue;
        const parts = key.split('_');
        // key format: "sourceId_destId_productId"
        const destId = parts[1];
        const productId = parts[2];
        const demandKey = `${destId}_${productId}`;
        if (evaluatedDemandKeys.has(demandKey)) {
            staleIds.push(id);
        }
    }
    if (staleIds.length) {
        await sequelize.query(`
            UPDATE transfer_suggestions
            SET status = 'expired', updated_at = NOW()
            WHERE id = ANY(ARRAY[${staleIds.join(',')}])
        `, { transaction });
    }

    return toUpdate.length + toInsert.length;
};

// ─── Public: runTransferScan ──────────────────────────────────────────────
/**
 * Entry point chính — chạy toàn bộ pipeline MFTS.
 *
 * @param {object}  options
 * @param {number[]|null} options.allowedStoreIds - Giới hạn store (null = all)
 * @returns {{ demands: number, supply_sources: number, suggestions: number }}
 */
export const runTransferScan = async ({ allowedStoreIds = null } = {}) => {
    const transaction = await sequelize.transaction();

    try {
        // Bước 1: Phát hiện nhu cầu
        const demands = await detectDemands(allowedStoreIds);
        if (!demands.length) {
            await transaction.commit();
            return { demands: 0, supply_sources: 0, suggestions: 0 };
        }

        const productIds = [...new Set(demands.map(d => d.product_id))];
        const demandStoreIds = [...new Set(demands.map(d => d.store_id))];

        // Bước 2: Tìm nguồn cung
        const supplyMap = await discoverSupply(productIds, demandStoreIds);
        const totalSources = [...supplyMap.values()].reduce((s, arr) => s + arr.length, 0);

        if (!totalSources) {
            await transaction.commit();
            return { demands: demands.length, supply_sources: 0, suggestions: 0 };
        }

        // Bước 3: Chấm điểm
        const scored = scoreCandidates(demands, supplyMap);

        // Bước 4: Greedy Allocation
        const allocations = greedyAllocate(scored);

        // Bước 5: Lưu đề xuất (truyền demands để xác định scope expire)
        const savedCount = await persistSuggestions(allocations, demands, transaction);

        await transaction.commit();

        return {
            demands: demands.length,
            supply_sources: totalSources,
            suggestions: savedCount
        };
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};

// ─── Cron Job ─────────────────────────────────────────────────────────────
const getVnDateLabel = () => {
    const now = new Date();
    const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return vn.toISOString().replace('T', ' ').slice(0, 19);
};

export const startTransferEngineJob = () => {
    // Chạy mỗi 6 giờ
    cron.schedule('0 */6 * * *', async () => {
        try {
            console.log(`⏰ [Cron Transfer] Scanning at ${getVnDateLabel()}`);
            const result = await runTransferScan();
            console.log(
                `🚚 [Cron Transfer] Done — demands: ${result.demands}, ` +
                `sources: ${result.supply_sources}, suggestions: ${result.suggestions}`
            );
        } catch (err) {
            console.error('❌ [Cron Transfer] Scan failed:', err.message);
        }
    });

    console.log('🚚 Transfer Engine cron job started (every 6h)');
};
