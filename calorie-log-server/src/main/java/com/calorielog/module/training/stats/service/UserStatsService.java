package com.calorielog.module.training.stats.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.calorielog.module.record.entity.DailySummary;
import com.calorielog.module.record.mapper.DailySummaryMapper;
import com.calorielog.module.training.session.entity.CompletedSet;
import com.calorielog.module.training.session.entity.ExerciseSession;
import com.calorielog.module.training.session.entity.WorkoutSession;
import com.calorielog.module.training.session.mapper.CompletedSetMapper;
import com.calorielog.module.training.session.mapper.ExerciseSessionMapper;
import com.calorielog.module.training.session.mapper.WorkoutSessionMapper;
import com.calorielog.module.training.stats.dto.UserStatsResponse;
import com.calorielog.module.training.stats.entity.PersonalRecord;
import com.calorielog.module.training.stats.entity.UserStats;
import com.calorielog.module.training.stats.mapper.PersonalRecordMapper;
import com.calorielog.module.training.stats.mapper.UserStatsMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserStatsService {

    private final UserStatsMapper userStatsMapper;
    private final PersonalRecordMapper personalRecordMapper;
    private final WorkoutSessionMapper sessionMapper;
    private final ExerciseSessionMapper exerciseSessionMapper;
    private final CompletedSetMapper completedSetMapper;
    private final DailySummaryMapper dailySummaryMapper;

    public void initForUser(Long userId) {
        UserStats stats = new UserStats();
        stats.setUserId(userId);
        stats.setTotalWorkouts(0);
        stats.setTotalVolume(BigDecimal.ZERO);
        stats.setCurrentStreak(0);
        stats.setLongestStreak(0);
        stats.setWeeklyAverage(BigDecimal.ZERO);
        userStatsMapper.insert(stats);
    }

    public UserStatsResponse getStats(Long userId) {
        UserStats stats = userStatsMapper.selectById(userId);
        if (stats == null) {
            initForUser(userId);
            stats = userStatsMapper.selectById(userId);
        }
        UserStatsResponse r = new UserStatsResponse();
        r.setTotalWorkouts(stats.getTotalWorkouts());
        r.setTotalVolume(stats.getTotalVolume());
        r.setCurrentStreak(stats.getCurrentStreak());
        r.setLongestStreak(stats.getLongestStreak());
        r.setWeeklyAverage(stats.getWeeklyAverage());
        r.setLastWorkoutDate(stats.getLastWorkoutDate());
        r.setUpdatedAt(stats.getUpdatedAt());

        Map<Long, UserStatsResponse.PRValue> prMap = new HashMap<>();
        for (PersonalRecord pr : personalRecordMapper.findByUser(userId)) {
            UserStatsResponse.PRValue v = new UserStatsResponse.PRValue();
            v.setWeight(pr.getWeight());
            v.setDate(pr.getRecordedAt());
            prMap.put(pr.getExerciseId(), v);
        }
        r.setPersonalRecords(prMap);

        // 今日运动消耗 + 当前差额
        DailySummary today = dailySummaryMapper.findByDate(userId, java.time.LocalDate.now());
        if (today != null) {
            BigDecimal exKcal = today.getExerciseCalories() != null ? today.getExerciseCalories() : BigDecimal.ZERO;
            r.setTodayExerciseCalories(exKcal);
            // 当前差额 = 生活消耗 + 运动消耗 - 饮食摄入
            BigDecimal tdee = today.getTdee() != null ? today.getTdee() : BigDecimal.ZERO;
            BigDecimal intake = today.getTotalCalories() != null ? today.getTotalCalories() : BigDecimal.ZERO;
            r.setTodayNetDeficit(tdee.add(exKcal).subtract(intake));
        } else {
            r.setTodayExerciseCalories(BigDecimal.ZERO);
            r.setTodayNetDeficit(BigDecimal.ZERO);
        }
        return r;
    }

    /** 训练完成后累计统计并更新 PR。返回本次新打破的 PR map。 */
    @Transactional
    public Map<Long, UserStatsResponse.PRValue> recordSessionFinish(
            Long userId, Long sessionId, BigDecimal sessionVolume,
            LocalDateTime finishedAt,
            List<ExerciseMaxWeight> maxWeights) {

        UserStats stats = userStatsMapper.selectById(userId);
        if (stats == null) {
            initForUser(userId);
            stats = userStatsMapper.selectById(userId);
        }
        stats.setTotalWorkouts(stats.getTotalWorkouts() + 1);
        stats.setTotalVolume(stats.getTotalVolume().add(sessionVolume == null ? BigDecimal.ZERO : sessionVolume));
        stats.setLastWorkoutDate(finishedAt);
        userStatsMapper.updateById(stats);

        Map<Long, UserStatsResponse.PRValue> newPRs = new HashMap<>();
        for (ExerciseMaxWeight emw : maxWeights) {
            if (emw.weight() == null || emw.weight().signum() <= 0) continue;
            PersonalRecord existing = personalRecordMapper.findByUserAndExercise(userId, emw.exerciseId());
            if (existing == null) {
                PersonalRecord pr = new PersonalRecord();
                pr.setUserId(userId);
                pr.setExerciseId(emw.exerciseId());
                pr.setWeight(emw.weight());
                pr.setRecordedAt(finishedAt);
                pr.setSessionId(sessionId);
                personalRecordMapper.insert(pr);
                newPRs.put(emw.exerciseId(), toPRValue(pr));
            } else if (emw.weight().compareTo(existing.getWeight()) > 0) {
                existing.setWeight(emw.weight());
                existing.setRecordedAt(finishedAt);
                existing.setSessionId(sessionId);
                personalRecordMapper.updateById(existing);
                newPRs.put(emw.exerciseId(), toPRValue(existing));
            }
        }
        return newPRs;
    }

    private UserStatsResponse.PRValue toPRValue(PersonalRecord pr) {
        UserStatsResponse.PRValue v = new UserStatsResponse.PRValue();
        v.setWeight(pr.getWeight());
        v.setDate(pr.getRecordedAt());
        return v;
    }

    /** 从当前仍存在的 completed session 全量重算 stats + PR。 */
    @Transactional
    public void recomputeForUser(Long userId) {
        QueryWrapper<WorkoutSession> wq = new QueryWrapper<>();
        wq.eq("user_id", userId)
          .eq("status", "completed")
          .isNull("deleted_at");
        List<WorkoutSession> sessions = sessionMapper.selectList(wq);

        int totalWorkouts = sessions.size();
        BigDecimal totalVolume = BigDecimal.ZERO;
        LocalDateTime lastWorkoutDate = null;
        java.util.TreeSet<java.time.LocalDate> trainingDays = new java.util.TreeSet<>();
        for (WorkoutSession s : sessions) {
            if (s.getTotalVolume() != null) {
                totalVolume = totalVolume.add(s.getTotalVolume());
            }
            LocalDateTime end = s.getEndTime() != null ? s.getEndTime() : s.getStartTime();
            if (end != null && (lastWorkoutDate == null || end.isAfter(lastWorkoutDate))) {
                lastWorkoutDate = end;
            }
            if (end != null) trainingDays.add(end.toLocalDate());
        }

        // streak / weekly_average 抽到 StreakCalculator 便于单测
        java.time.LocalDate today = java.time.LocalDate.now();
        StreakCalculator.Streaks streaks = StreakCalculator.streaks(trainingDays, today);
        int currentStreak = streaks.currentStreak();
        int longestStreak = streaks.longestStreak();
        BigDecimal weeklyAverage = BigDecimal.valueOf(StreakCalculator.weeklyAverage(trainingDays, today, 8))
                .setScale(2, java.math.RoundingMode.HALF_UP);

        UserStats stats = userStatsMapper.selectById(userId);
        if (stats == null) {
            initForUser(userId);
            stats = userStatsMapper.selectById(userId);
        }
        stats.setTotalWorkouts(totalWorkouts);
        stats.setTotalVolume(totalVolume);
        stats.setLastWorkoutDate(lastWorkoutDate);
        stats.setCurrentStreak(currentStreak);
        stats.setLongestStreak(longestStreak);
        stats.setWeeklyAverage(weeklyAverage);
        userStatsMapper.updateById(stats);

        Map<Long, BigDecimal> maxWeightByExercise = new HashMap<>();
        Map<Long, LocalDateTime> recordedAtByExercise = new HashMap<>();
        Map<Long, Long> sessionIdByExercise = new HashMap<>();
        if (!sessions.isEmpty()) {
            List<Long> sessionIds = sessions.stream().map(WorkoutSession::getId).collect(Collectors.toList());
            List<ExerciseSession> exs = exerciseSessionMapper.findBySessionIds(sessionIds);
            Map<Long, ExerciseSession> exById = exs.stream()
                    .collect(Collectors.toMap(ExerciseSession::getId, x -> x));
            Map<Long, LocalDateTime> sessionEndTime = sessions.stream()
                    .collect(Collectors.toMap(WorkoutSession::getId,
                            s -> s.getEndTime() != null ? s.getEndTime() : s.getStartTime()));
            List<Long> exIds = exs.stream().map(ExerciseSession::getId).collect(Collectors.toList());
            List<CompletedSet> sets = completedSetMapper.findByExerciseSessionIds(exIds);
            for (CompletedSet cs : sets) {
                if (!Boolean.TRUE.equals(cs.getIsCompleted())) continue;
                BigDecimal w = cs.getWeight() == null ? BigDecimal.ZERO : cs.getWeight();
                if (w.signum() <= 0) continue;
                ExerciseSession ex = exById.get(cs.getExerciseSessionId());
                if (ex == null) continue;
                Long exerciseId = ex.getExerciseId();
                BigDecimal cur = maxWeightByExercise.get(exerciseId);
                if (cur == null || w.compareTo(cur) > 0) {
                    maxWeightByExercise.put(exerciseId, w);
                    recordedAtByExercise.put(exerciseId, sessionEndTime.get(ex.getSessionId()));
                    sessionIdByExercise.put(exerciseId, ex.getSessionId());
                }
            }
        }

        QueryWrapper<PersonalRecord> prq = new QueryWrapper<>();
        prq.eq("user_id", userId);
        personalRecordMapper.delete(prq);
        for (Map.Entry<Long, BigDecimal> entry : maxWeightByExercise.entrySet()) {
            PersonalRecord pr = new PersonalRecord();
            pr.setUserId(userId);
            pr.setExerciseId(entry.getKey());
            pr.setWeight(entry.getValue());
            pr.setRecordedAt(recordedAtByExercise.getOrDefault(entry.getKey(), LocalDateTime.now()));
            pr.setSessionId(sessionIdByExercise.get(entry.getKey()));
            personalRecordMapper.insert(pr);
        }
    }

    public record ExerciseMaxWeight(Long exerciseId, BigDecimal weight) {}
}
