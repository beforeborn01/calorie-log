package com.calorielog.module.social.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.module.record.entity.DailySummary;
import com.calorielog.module.record.entity.DietRecord;
import com.calorielog.module.record.mapper.DietRecordMapper;
import com.calorielog.module.record.service.DailySummaryService;
import com.calorielog.module.social.dto.ExpLogResponse;
import com.calorielog.module.social.dto.ExperienceResponse;
import com.calorielog.module.social.entity.UserExpLog;
import com.calorielog.module.social.mapper.UserExpLogMapper;
import com.calorielog.module.user.entity.UserExperience;
import com.calorielog.module.user.mapper.UserExperienceMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExperienceService {

    public static final String REASON_FIRST_RECORD = "first_record_today";
    public static final String REASON_THREE_MEALS = "complete_three_meals";
    public static final String REASON_CALORIE_ON_TARGET = "calorie_on_target";
    public static final String REASON_STREAK_7 = "streak_7";
    public static final String REASON_STREAK_30 = "streak_30";

    private static final int EXP_FIRST_RECORD = 10;
    private static final int EXP_THREE_MEALS = 20;
    private static final int EXP_CALORIE_ON_TARGET = 15;
    private static final int EXP_STREAK_7 = 50;
    private static final int EXP_STREAK_30 = 200;

    private static final BigDecimal CALORIE_TOLERANCE = new BigDecimal("0.10");

    private final UserExperienceMapper experienceMapper;
    private final UserExpLogMapper expLogMapper;
    private final DietRecordMapper dietRecordMapper;
    private final DailySummaryService dailySummaryService;
    private final ObjectProvider<RankingService> rankingServiceProvider;

    public ExperienceResponse getOrInit(Long userId) {
        return toResponse(loadOrInit(userId));
    }

    public List<ExpLogResponse> recentLogs(Long userId, int limit) {
        QueryWrapper<UserExpLog> wrapper = new QueryWrapper<>();
        wrapper.eq("user_id", userId).orderByDesc("created_at").last("LIMIT " + Math.min(limit, 200));
        return expLogMapper.selectList(wrapper).stream().map(log -> {
            ExpLogResponse r = new ExpLogResponse();
            r.setId(log.getId());
            r.setExpChange(log.getExpChange());
            r.setReasonCode(log.getReasonCode());
            r.setReasonDetail(log.getReasonDetail());
            r.setCreatedAt(log.getCreatedAt());
            return r;
        }).toList();
    }

    /** 饮食记录创建后异步检查一系列奖励。失败吞异常，不影响主流程。 */
    @Async
    @Transactional
    public void awardAsync(Long userId, LocalDate recordDate) {
        try {
            award(userId, recordDate);
        } catch (Exception e) {
            log.warn("经验值发放失败 userId={} date={}", userId, recordDate, e);
        }
    }

    public void award(Long userId, LocalDate recordDate) {
        UserExperience exp = loadOrInit(userId);

        int streakMilestone = updateStreak(exp, recordDate);
        experienceMapper.updateById(exp);

        int gainedFirst = awardIfAbsent(userId, REASON_FIRST_RECORD, recordDate,
                EXP_FIRST_RECORD, "今日首次记录");

        int gainedMeals = 0;
        if (isThreeMealsComplete(userId, recordDate)) {
            gainedMeals = awardIfAbsent(userId, REASON_THREE_MEALS, recordDate,
                    EXP_THREE_MEALS, "完成三餐记录");
        }

        int gainedCalorie = 0;
        if (isCalorieOnTarget(userId, recordDate)) {
            gainedCalorie = awardIfAbsent(userId, REASON_CALORIE_ON_TARGET, recordDate,
                    EXP_CALORIE_ON_TARGET, "热量达标（±10%）");
        }

        int gainedStreak = 0;
        if (streakMilestone == 7) {
            gainedStreak = awardIfAbsent(userId, REASON_STREAK_7, recordDate,
                    EXP_STREAK_7, "连续记录 7 天");
        } else if (streakMilestone == 30) {
            gainedStreak = awardIfAbsent(userId, REASON_STREAK_30, recordDate,
                    EXP_STREAK_30, "连续记录 30 天");
        }

        long totalGain = (long) gainedFirst + gainedMeals + gainedCalorie + gainedStreak;
        if (totalGain > 0) {
            applyExpGain(userId, totalGain);
            rankingServiceProvider.ifAvailable(r -> r.onExpChange(userId));
        }
    }

    /** 返回本次推进到的里程碑（7/30/其它），便于上层判断是否该发里程碑奖励。 */
    private int updateStreak(UserExperience exp, LocalDate recordDate) {
        LocalDate last = exp.getLastRecordDate();
        int days;
        if (last == null) {
            days = 1;
        } else if (last.equals(recordDate)) {
            days = exp.getContinuousDays() == null ? 1 : exp.getContinuousDays();
        } else if (last.plusDays(1).equals(recordDate)) {
            days = (exp.getContinuousDays() == null ? 0 : exp.getContinuousDays()) + 1;
        } else if (recordDate.isAfter(last)) {
            days = 1;
        } else {
            // 补录过去的某一天，不推进连续天数
            days = exp.getContinuousDays() == null ? 0 : exp.getContinuousDays();
        }
        exp.setContinuousDays(days);
        if (last == null || recordDate.isAfter(last)) {
            exp.setLastRecordDate(recordDate);
        }
        return days;
    }

    private int awardIfAbsent(Long userId, String reasonCode, LocalDate recordDate,
                              int expChange, String detail) {
        LocalDateTime dayStart = recordDate.atStartOfDay();
        LocalDateTime nextDayStart = recordDate.plusDays(1).atStartOfDay();
        QueryWrapper<UserExpLog> w = new QueryWrapper<>();
        w.eq("user_id", userId)
                .eq("reason_code", reasonCode)
                .ge("created_at", dayStart)
                .lt("created_at", nextDayStart);
        Long count = expLogMapper.selectCount(w);
        if (count != null && count > 0) return 0;

        UserExpLog log = new UserExpLog();
        log.setUserId(userId);
        log.setExpChange(expChange);
        log.setReasonCode(reasonCode);
        log.setReasonDetail(detail + " @ " + recordDate);
        log.setCreatedAt(LocalDateTime.now());
        expLogMapper.insert(log);
        return expChange;
    }

    private boolean isThreeMealsComplete(Long userId, LocalDate date) {
        List<DietRecord> all = dietRecordMapper.findByDate(userId, date);
        Set<Integer> meals = new HashSet<>();
        for (DietRecord r : all) {
            if (r.getMealType() != null && r.getMealType() >= 1 && r.getMealType() <= 3) {
                meals.add(r.getMealType());
            }
        }
        return meals.contains(1) && meals.contains(2) && meals.contains(3);
    }

    private boolean isCalorieOnTarget(Long userId, LocalDate date) {
        DailySummary s = dailySummaryService.getOrInit(userId, date);
        if (s == null || s.getTargetCalories() == null || s.getTotalCalories() == null) return false;
        BigDecimal target = s.getTargetCalories();
        if (target.signum() <= 0) return false;
        BigDecimal gap = s.getCalorieGap() == null
                ? s.getTotalCalories().subtract(target)
                : s.getCalorieGap();
        BigDecimal ratio = gap.abs().divide(target, 4, RoundingMode.HALF_UP);
        return ratio.compareTo(CALORIE_TOLERANCE) <= 0;
    }

    private void applyExpGain(Long userId, long delta) {
        int attempts = 0;
        while (attempts++ < 3) {
            UserExperience exp = experienceMapper.selectOne(
                    new QueryWrapper<UserExperience>().eq("user_id", userId));
            if (exp == null) exp = loadOrInit(userId);
            long total = (exp.getTotalExp() == null ? 0L : exp.getTotalExp()) + delta;
            int level = computeLevel(total);
            exp.setTotalExp(total);
            exp.setLevel(level);
            int affected = experienceMapper.updateById(exp);
            if (affected == 1) return;
        }
        throw new BizException(ErrorCode.CONCURRENT_MODIFICATION);
    }

    private UserExperience loadOrInit(Long userId) {
        UserExperience exp = experienceMapper.selectOne(
                new QueryWrapper<UserExperience>().eq("user_id", userId));
        if (exp != null) return exp;
        exp = new UserExperience();
        exp.setUserId(userId);
        exp.setTotalExp(0L);
        exp.setLevel(1);
        exp.setContinuousDays(0);
        experienceMapper.insert(exp);
        return exp;
    }

    /** 等级曲线：Lv N → Lv N+1 需要 100 * N^2 exp（累计见 levelThreshold） */
    public static int computeLevel(long totalExp) {
        int level = 1;
        while (level < 99 && totalExp >= levelThreshold(level + 1)) {
            level++;
        }
        return level;
    }

    /** 累计达到 level 所需的 exp 总量。Lv1=0, Lv2=100, Lv3=500, Lv4=1400, Lv5=3000, Lv10=28500 */
    public static long levelThreshold(int level) {
        long sum = 0;
        for (int i = 1; i < level; i++) {
            sum += 100L * i * i;
        }
        return sum;
    }

    private ExperienceResponse toResponse(UserExperience exp) {
        ExperienceResponse r = new ExperienceResponse();
        r.setUserId(exp.getUserId());
        long total = exp.getTotalExp() == null ? 0L : exp.getTotalExp();
        int level = computeLevel(total);
        long currentLevelExp = levelThreshold(level);
        long nextLevelExp = levelThreshold(level + 1);
        r.setTotalExp(total);
        r.setLevel(level);
        r.setContinuousDays(exp.getContinuousDays());
        r.setLastRecordDate(exp.getLastRecordDate());
        r.setCurrentLevelExp(currentLevelExp);
        r.setNextLevelExp(nextLevelExp);
        r.setExpToNextLevel(Math.max(0, nextLevelExp - total));
        long range = nextLevelExp - currentLevelExp;
        BigDecimal progress;
        if (range <= 0) {
            progress = BigDecimal.ONE;
        } else {
            double pct = (double) (total - currentLevelExp) / range;
            progress = BigDecimal.valueOf(Math.max(0, Math.min(1, pct)))
                    .setScale(4, RoundingMode.HALF_UP);
        }
        r.setLevelProgress(progress);
        return r;
    }
}
