package com.calorielog.module.training.session.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

/**
 * 运动代谢当量（MET）表，用于估算热量消耗。
 *
 * 公式：kcal = MET × 体重(kg) × 时长(小时)
 *
 * MET 取值参考 ACSM Compendium of Physical Activities（数值为常见区间的中位）。
 * 力量训练 type=strength 时按"中等强度抗阻训练" 5.0 估；
 * 有氧 cardio 取 7.0（接近慢跑/骑车中等强度的折中）；
 * 柔韧 mobility / 拉伸 2.5；混合 5.5。
 *
 * 注：当 plan.type 未明确时退到 5.0；体重为空时按 60kg 兜底。
 */
public final class MetTable {

    private MetTable() {}

    private static final Map<String, Double> BY_TYPE = Map.of(
            "strength", 5.0,
            "cardio", 7.0,
            "mobility", 2.5,
            "mixed", 5.5
    );

    public static double metForType(String type) {
        if (type == null) return 5.0;
        return BY_TYPE.getOrDefault(type.toLowerCase(), 5.0);
    }

    /**
     * @param durationSeconds 训练时长（秒）
     * @param bodyWeightKg   体重（kg），为 null 时按 60 兜底
     * @param planType       训练类型 strength/cardio/mobility/mixed
     * @return 消耗的 kcal，保留 1 位小数
     */
    public static BigDecimal estimateKcal(Integer durationSeconds, BigDecimal bodyWeightKg, String planType) {
        if (durationSeconds == null || durationSeconds <= 0) return BigDecimal.ZERO;
        double hours = durationSeconds / 3600.0;
        double kg = bodyWeightKg != null ? bodyWeightKg.doubleValue() : 60.0;
        double met = metForType(planType);
        double kcal = met * kg * hours;
        return BigDecimal.valueOf(kcal).setScale(1, RoundingMode.HALF_UP);
    }
}
