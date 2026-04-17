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

        // 日期类型 + 目标热量 + TDEE（若目标未设或资料不全则留空）
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
                target = dc.targetCalories;
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
        if (s != null) return s;
        recompute(userId, date);
        return summaryMapper.findByDate(userId, date);
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

    private static BigDecimal asDecimal(Object v) {
        if (v == null) return BigDecimal.ZERO;
        if (v instanceof BigDecimal bd) return bd;
        if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return new BigDecimal(v.toString());
    }
}
