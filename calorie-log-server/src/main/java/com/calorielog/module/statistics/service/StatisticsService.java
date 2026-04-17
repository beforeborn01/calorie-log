package com.calorielog.module.statistics.service;

import com.calorielog.module.goal.entity.UserGoal;
import com.calorielog.module.goal.service.GoalService;
import com.calorielog.module.record.entity.DailySummary;
import com.calorielog.module.record.service.DailySummaryService;
import com.calorielog.module.statistics.dto.DailyStatisticsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class StatisticsService {

    private final DailySummaryService summaryService;
    private final GoalService goalService;

    private static final BigDecimal BALANCED_THRESHOLD = new BigDecimal("50");

    public DailyStatisticsResponse getDaily(Long userId, LocalDate date) {
        DailySummary s = summaryService.getOrInit(userId, date);
        DailyStatisticsResponse r = new DailyStatisticsResponse();
        r.setDate(date);
        r.setDayType(s.getDayType());
        r.setTotalCalories(nz(s.getTotalCalories()));
        r.setTotalProtein(nz(s.getTotalProtein()));
        r.setTotalCarb(nz(s.getTotalCarb()));
        r.setTotalFat(nz(s.getTotalFat()));
        r.setTotalFiber(nz(s.getTotalFiber()));
        r.setTdee(s.getTdee());
        r.setTargetCalories(s.getTargetCalories());
        r.setCalorieGap(s.getCalorieGap());
        r.setFoodVarietyCount(s.getFoodVarietyCount());
        r.setDietScore(s.getDietScore());

        if (s.getCalorieGap() == null || s.getTargetCalories() == null) {
            r.setCalorieStatus("unknown");
            r.setStatusHint("请先完善个人资料并设置健身目标");
            return r;
        }
        BigDecimal gap = s.getCalorieGap();
        if (gap.abs().compareTo(BALANCED_THRESHOLD) <= 0) {
            r.setCalorieStatus("balanced");
            r.setStatusHint("热量摄入与目标接近，保持即可");
        } else if (gap.signum() > 0) {
            r.setCalorieStatus("surplus");
            r.setStatusHint(buildHint(userId, gap, true));
        } else {
            r.setCalorieStatus("deficit");
            r.setStatusHint(buildHint(userId, gap, false));
        }
        return r;
    }

    private String buildHint(Long userId, BigDecimal gap, boolean surplus) {
        UserGoal goal = goalService.findActiveOrNull(userId);
        String abs = gap.abs().setScale(0, java.math.RoundingMode.HALF_UP).toPlainString();
        if (goal == null) {
            return surplus ? "当前热量盈余 " + abs + " kcal" : "当前热量缺口 " + abs + " kcal";
        }
        if (goal.getGoalType() == 1) {
            // 增肌
            return surplus
                    ? "当前热量盈余 " + abs + " kcal，符合增肌需求"
                    : "当前热量缺口 " + abs + " kcal，可能影响增肌进度";
        } else {
            return surplus
                    ? "当前热量盈余 " + abs + " kcal，减脂期建议控制"
                    : "当前热量缺口 " + abs + " kcal，有助于减脂";
        }
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}
