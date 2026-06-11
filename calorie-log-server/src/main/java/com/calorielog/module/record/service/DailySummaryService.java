package com.calorielog.module.record.service;

import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.module.goal.entity.UserGoal;
import com.calorielog.module.goal.service.GoalService;
import com.calorielog.module.goal.service.TdeeCalculationService;
import com.calorielog.module.goal.service.TrainingScheduleService;
import com.calorielog.module.record.entity.DailySummary;
import com.calorielog.module.record.mapper.DailySummaryMapper;
import com.calorielog.module.record.mapper.DietRecordMapper;
import com.calorielog.module.user.entity.User;
import com.calorielog.module.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class DailySummaryService {

    private final DailySummaryMapper summaryMapper;
    private final DietRecordMapper recordMapper;
    private final UserMapper userMapper;
    private final GoalService goalService;
    private final TrainingScheduleService trainingScheduleService;
    private final TdeeCalculationService tdeeCalculationService;

    private static final BigDecimal DEFAULT_TARGET = new BigDecimal("2000");

    @Transactional
    public void recompute(Long userId, LocalDate date) {
        Map<String, Object> agg = recordMapper.aggregateByDate(userId, date);
        BigDecimal totalCal = asDecimal(agg.get("total_calories"));
        BigDecimal totalPro = asDecimal(agg.get("total_protein"));
        BigDecimal totalCarb = asDecimal(agg.get("total_carb"));
        BigDecimal totalFat = asDecimal(agg.get("total_fat"));
        BigDecimal totalFiber = asDecimal(agg.get("total_fiber"));
        Integer varietyCount = agg.get("food_variety_count") == null ? 0
                : ((Number) agg.get("food_variety_count")).intValue();

        // 日期类型仍保留用于展示/计划，但饮食目标不再按计划训练日浮动；
        // 实际运动只进入 exerciseCalories 和 netDeficit。
        Integer dayType = null;
        BigDecimal tdee = null;
        BigDecimal target = null;
        UserGoal goal = goalService.findActiveOrNull(userId);
        User user = userMapper.selectById(userId);
        if (goal != null && user != null && hasCompleteProfile(user)) {
            TrainingScheduleService.DayInfo info = trainingScheduleService.resolve(userId, date);
            dayType = info.trainingDay ? 1 : 2;
            try {
                TdeeCalculationService.DailyCalories dc = tdeeCalculationService.computeDaily(
                        user, goal.getGoalType(), info.trainingDay, info.intensity);
                tdee = dc.tdee;
                target = fixedTargetOrComputed(goal, dc.targetCalories);
                if (target == null) target = dc.targetCalories;
            } catch (BizException e) {
                log.warn("recompute daily TDEE failed: userId={} {}", userId, e.getMessage());
            }
        }
        BigDecimal gap = (target == null) ? null : totalCal.subtract(target);

        DailySummary summary = summaryMapper.findByDate(userId, date);
        if (summary == null) {
            summary = new DailySummary();
            summary.setUserId(userId);
            summary.setSummaryDate(date);
            applyFields(summary, dayType, totalCal, totalPro, totalCarb, totalFat, totalFiber,
                    varietyCount, tdee, target, gap);
            summary.setUpdatedAt(LocalDateTime.now());
            summary.setVersion(0);
            summaryMapper.insert(summary);
        } else {
            applyFields(summary, dayType, totalCal, totalPro, totalCarb, totalFat, totalFiber,
                    varietyCount, tdee, target, gap);
            summary.setUpdatedAt(LocalDateTime.now());

            int rows = 0;
            int attempts = 0;
            while (rows == 0 && attempts < 3) {
                rows = summaryMapper.updateById(summary);
                if (rows == 0) {
                    summary = summaryMapper.findByDate(userId, date);
                    if (summary == null) break;
                    applyFields(summary, dayType, totalCal, totalPro, totalCarb, totalFat, totalFiber,
                            varietyCount, tdee, target, gap);
                    summary.setUpdatedAt(LocalDateTime.now());
                }
                attempts++;
            }
            if (rows == 0) {
                log.warn("DailySummary concurrent update failed: userId={} date={}", userId, date);
                throw new BizException(ErrorCode.CONCURRENT_MODIFICATION);
            }
        }
    }

    public DailySummary getOrInit(Long userId, LocalDate date) {
        DailySummary s = summaryMapper.findByDate(userId, date);
        if (s == null) {
            recompute(userId, date);
            return summaryMapper.findByDate(userId, date);
        }
        // 自愈：行已存在但目标热量/TDEE 为空，或目标仍是旧版「训练日/休息日浮动」模型时，
        // 若用户当前已具备完整资料 + active 目标，则重算一次把 tdee/target/gap 补齐。
        if (needsTargetRefresh(userId, s)) {
            recompute(userId, date);
            s = summaryMapper.findByDate(userId, date);
        }
        return s;
    }

    /** 是否需要刷新目标热量：资料完整 + active 目标 + 当前汇总缺失或不符合新模型。 */
    private boolean needsTargetRefresh(Long userId, DailySummary summary) {
        User user = userMapper.selectById(userId);
        UserGoal goal = goalService.findActiveOrNull(userId);
        if (user == null || !hasCompleteProfile(user) || goal == null) return false;
        if (summary.getTargetCalories() == null || summary.getTdee() == null) return true;
        try {
            TrainingScheduleService.DayInfo info = trainingScheduleService.resolve(userId, summary.getSummaryDate());
            TdeeCalculationService.DailyCalories dc = tdeeCalculationService.computeDaily(
                    user, goal.getGoalType(), info.trainingDay, info.intensity);
            BigDecimal expectedTarget = fixedTargetOrComputed(goal, dc.targetCalories);
            return summary.getTdee().compareTo(dc.tdee) != 0
                    || summary.getTargetCalories().compareTo(expectedTarget) != 0;
        } catch (BizException e) {
            return false;
        }
    }

    public BigDecimal resolveTargetCalories(Long userId, LocalDate date) {
        DailySummary s = summaryMapper.findByDate(userId, date);
        if (s != null && s.getTargetCalories() != null) return s.getTargetCalories();
        return DEFAULT_TARGET;
    }

    public void updateDietScore(Long userId, LocalDate date, BigDecimal score) {
        DailySummary s = summaryMapper.findByDate(userId, date);
        if (s == null) return;
        s.setDietScore(score);
        s.setUpdatedAt(LocalDateTime.now());
        summaryMapper.updateById(s);
    }

    private void applyFields(DailySummary s, Integer dayType,
                             BigDecimal cal, BigDecimal pro, BigDecimal carb, BigDecimal fat, BigDecimal fiber,
                             Integer varietyCount,
                             BigDecimal tdee, BigDecimal target, BigDecimal gap) {
        s.setDayType(dayType);
        s.setTotalCalories(cal);
        s.setTotalProtein(pro);
        s.setTotalCarb(carb);
        s.setTotalFat(fat);
        s.setTotalFiber(fiber);
        s.setFoodVarietyCount(varietyCount);
        s.setTdee(tdee);
        s.setTargetCalories(target);
        s.setCalorieGap(gap);
    }

    private static boolean hasCompleteProfile(User u) {
        return u.getGender() != null && u.getGender() > 0
                && u.getAge() != null && u.getHeight() != null
                && u.getWeight() != null && u.getActivityLevel() != null;
    }

    private static BigDecimal fixedTargetOrComputed(UserGoal goal, BigDecimal computed) {
        BigDecimal training = goal.getTargetCaloriesTraining();
        BigDecimal rest = goal.getTargetCaloriesRest();
        if (training != null && rest != null && training.compareTo(rest) == 0) return rest;
        return computed;
    }

    private static BigDecimal asDecimal(Object v) {
        if (v == null) return BigDecimal.ZERO;
        if (v instanceof BigDecimal bd) return bd;
        if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return new BigDecimal(v.toString());
    }
}
