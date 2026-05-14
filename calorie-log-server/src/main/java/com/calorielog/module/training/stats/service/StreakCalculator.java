package com.calorielog.module.training.stats.service;

import java.time.LocalDate;
import java.util.SortedSet;
import java.util.TreeSet;

/**
 * 训练连续天数 / 周均次数 工具。
 * 抽成静态方法，便于单元测试和复用。
 *
 * 输入是用户的"有训练的日期集合"（一天 1 个），输出 streak 指标。
 */
public final class StreakCalculator {
    private StreakCalculator() {}

    public record Streaks(int currentStreak, int longestStreak) {}

    public static Streaks streaks(SortedSet<LocalDate> days, LocalDate today) {
        if (days == null || days.isEmpty()) return new Streaks(0, 0);

        int longest = 0;
        int run = 0;
        LocalDate prev = null;
        for (LocalDate d : days) {
            if (prev == null || prev.plusDays(1).equals(d)) {
                run = (prev == null) ? 1 : run + 1;
            } else {
                run = 1;
            }
            if (run > longest) longest = run;
            prev = d;
        }

        // current streak: 从今天往回数，允许"今天还没练"用昨天起算
        int current = 0;
        LocalDate cursor;
        if (days.contains(today)) cursor = today;
        else if (days.contains(today.minusDays(1))) cursor = today.minusDays(1);
        else cursor = null;
        while (cursor != null && days.contains(cursor)) {
            current++;
            cursor = cursor.minusDays(1);
        }
        return new Streaks(current, longest);
    }

    /** 过去 N 周的次数 / N（次/周） */
    public static double weeklyAverage(SortedSet<LocalDate> days, LocalDate today, int weeks) {
        if (days == null || days.isEmpty() || weeks <= 0) return 0.0;
        LocalDate from = today.minusWeeks(weeks);
        long count = days.stream().filter(d -> !d.isBefore(from)).count();
        return (double) count / weeks;
    }

    /** 便于调用方构造日期集合 */
    public static TreeSet<LocalDate> newDaySet() {
        return new TreeSet<>();
    }
}
