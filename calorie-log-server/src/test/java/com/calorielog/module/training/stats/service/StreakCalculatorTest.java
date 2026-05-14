package com.calorielog.module.training.stats.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.TreeSet;

import static org.junit.jupiter.api.Assertions.*;

class StreakCalculatorTest {

    private static TreeSet<LocalDate> days(String... isoDates) {
        TreeSet<LocalDate> s = new TreeSet<>();
        for (String d : isoDates) s.add(LocalDate.parse(d));
        return s;
    }

    @Test
    void empty_set_returns_zero() {
        var r = StreakCalculator.streaks(new TreeSet<>(), LocalDate.parse("2026-05-14"));
        assertEquals(0, r.currentStreak());
        assertEquals(0, r.longestStreak());
    }

    @Test
    void single_day_today_is_streak_1() {
        var r = StreakCalculator.streaks(days("2026-05-14"), LocalDate.parse("2026-05-14"));
        assertEquals(1, r.currentStreak());
        assertEquals(1, r.longestStreak());
    }

    @Test
    void five_consecutive_days_today() {
        var r = StreakCalculator.streaks(
                days("2026-05-10", "2026-05-11", "2026-05-12", "2026-05-13", "2026-05-14"),
                LocalDate.parse("2026-05-14")
        );
        assertEquals(5, r.currentStreak());
        assertEquals(5, r.longestStreak());
    }

    @Test
    void broken_streak_today_zero_but_longest_preserved() {
        // 上周连续 3 天，本周没练
        var r = StreakCalculator.streaks(
                days("2026-05-05", "2026-05-06", "2026-05-07"),
                LocalDate.parse("2026-05-14")
        );
        assertEquals(0, r.currentStreak());
        assertEquals(3, r.longestStreak());
    }

    @Test
    void yesterday_counts_for_current_when_today_missing() {
        // 今天没练但昨天练了 → current 算到昨天
        var r = StreakCalculator.streaks(
                days("2026-05-12", "2026-05-13"),
                LocalDate.parse("2026-05-14")
        );
        assertEquals(2, r.currentStreak());
        assertEquals(2, r.longestStreak());
    }

    @Test
    void longest_is_max_across_history() {
        // 两段连续记录：3天 + 2天，今天属于后一段
        var r = StreakCalculator.streaks(
                days("2026-04-01", "2026-04-02", "2026-04-03",  // 3 day run
                     "2026-05-13", "2026-05-14"),                // 2 day run (含 today)
                LocalDate.parse("2026-05-14")
        );
        assertEquals(2, r.currentStreak());
        assertEquals(3, r.longestStreak());
    }

    @Test
    void weekly_average_counts_only_window() {
        var ds = days(
                "2026-03-01", "2026-03-02",                 // 8 周外
                "2026-04-15", "2026-04-22", "2026-04-29",
                "2026-05-06", "2026-05-13"
        );
        // 8 weeks back from 2026-05-14 = 2026-03-19. 落在 [from, today] 的：4 月 15 起共 5 天
        double avg = StreakCalculator.weeklyAverage(ds, LocalDate.parse("2026-05-14"), 8);
        assertEquals(5.0 / 8, avg, 1e-9);
    }
}
