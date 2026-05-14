package com.calorielog.module.training.session.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class MetTableTest {

    private static BigDecimal bd(String s) {
        return new BigDecimal(s);
    }

    @Test
    void metForType_unknown_falls_back_to_5() {
        assertEquals(5.0, MetTable.metForType(null));
        assertEquals(5.0, MetTable.metForType("unknown-xyz"));
    }

    @ParameterizedTest
    @CsvSource({
            "strength, 5.0",
            "cardio,   7.0",
            "mobility, 2.5",
            "mixed,    5.5",
            "STRENGTH, 5.0",   // 大小写无关
    })
    void metForType_canonical_values(String type, double expected) {
        assertEquals(expected, MetTable.metForType(type));
    }

    @Test
    void estimateKcal_zero_duration_returns_zero() {
        assertEquals(BigDecimal.ZERO, MetTable.estimateKcal(0, bd("60"), "strength"));
        assertEquals(BigDecimal.ZERO, MetTable.estimateKcal(null, bd("60"), "strength"));
        assertEquals(BigDecimal.ZERO, MetTable.estimateKcal(-1, bd("60"), "strength"));
    }

    @Test
    void estimateKcal_null_weight_falls_back_to_60kg() {
        // 60kg × 5.0 MET × 1h = 300
        assertEquals(bd("300.0"), MetTable.estimateKcal(3600, null, "strength"));
    }

    @Test
    void estimateKcal_strength_30min_70kg() {
        // 70 × 5.0 × 0.5 = 175
        assertEquals(bd("175.0"), MetTable.estimateKcal(1800, bd("70"), "strength"));
    }

    @Test
    void estimateKcal_cardio_30min_80kg() {
        // 80 × 7.0 × 0.5 = 280
        assertEquals(bd("280.0"), MetTable.estimateKcal(1800, bd("80"), "cardio"));
    }

    @Test
    void estimateKcal_rounds_to_one_decimal_half_up() {
        // 65kg × 5.0 × (1801/3600) ≈ 162.59... → 162.6
        BigDecimal v = MetTable.estimateKcal(1801, bd("65"), "strength");
        assertEquals(1, v.scale());
        assertEquals(bd("162.6"), v);
    }
}
