package com.calorielog.module.training.session.service;

import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.module.training.session.dto.CompletedSetDTO;
import com.calorielog.module.training.session.dto.ExerciseSessionDTO;
import com.calorielog.module.training.session.dto.FinishSessionRequest;
import com.calorielog.module.training.session.dto.FinishSessionResponse;
import com.calorielog.module.training.session.dto.SaveSessionRequest;
import com.calorielog.module.training.session.dto.WorkoutSessionDTO;
import com.calorielog.module.training.session.entity.CompletedSet;
import com.calorielog.module.training.session.entity.ExerciseSession;
import com.calorielog.module.training.session.entity.WorkoutSession;
import com.calorielog.module.record.entity.DailySummary;
import com.calorielog.module.record.mapper.DailySummaryMapper;
import com.calorielog.module.record.service.DailySummaryService;
import com.calorielog.module.strength.entity.Exercise;
import com.calorielog.module.strength.mapper.ExerciseMapper;
import com.calorielog.module.training.plan.entity.WorkoutPlan;
import com.calorielog.module.training.plan.mapper.WorkoutPlanMapper;
import com.calorielog.module.training.session.mapper.CompletedSetMapper;
import com.calorielog.module.training.session.mapper.ExerciseSessionMapper;
import com.calorielog.module.training.session.mapper.WorkoutSessionMapper;
import com.calorielog.module.training.stats.dto.UserStatsResponse;
import com.calorielog.module.training.stats.service.UserStatsService;
import com.calorielog.module.user.entity.User;
import com.calorielog.module.user.mapper.UserMapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkoutSessionService {

    private final WorkoutSessionMapper sessionMapper;
    private final ExerciseSessionMapper exerciseSessionMapper;
    private final CompletedSetMapper completedSetMapper;
    private final UserStatsService userStatsService;
    private final UserMapper userMapper;
    private final WorkoutPlanMapper planMapper;
    private final DailySummaryMapper dailySummaryMapper;
    private final DailySummaryService dailySummaryService;
    private final ExerciseMapper exerciseMapper;

    /**
     * 按 (user, day) 全量重算 t_daily_summary.exercise_calories。
     *
     * <p>找当天所有 status=completed 且未删除的 session，按 MET × 体重 × 时长 求和后覆盖写。
     * create/update/delete/finish 都走这条路径，保证「修改 / 删除已完成会话」不会留下脏数据。
     * 幂等。</p>
     *
     * <p>归属规则：以 end_time 的日期归属；end_time 缺失则退到 start_time。跨午夜训练算在结束当天。</p>
     */
    void recomputeDailyExerciseCalories(Long userId, LocalDate day) {
        if (day == null) return;

        QueryWrapper<WorkoutSession> qw = new QueryWrapper<>();
        qw.eq("user_id", userId)
          .eq("status", "completed")
          .isNull("deleted_at");
        List<WorkoutSession> all = sessionMapper.selectList(qw);

        BigDecimal bodyWeight = getUserBodyWeight(userId);
        Map<Long, WorkoutPlan> planCache = new HashMap<>();
        BigDecimal total = BigDecimal.ZERO;
        for (WorkoutSession s : all) {
            LocalDateTime ref = s.getEndTime() != null ? s.getEndTime() : s.getStartTime();
            if (ref == null) continue;
            if (!day.equals(ref.toLocalDate())) continue;
            if (s.getDuration() == null || s.getDuration() <= 0) continue;

            String planType = "strength";
            if (s.getPlanId() != null) {
                WorkoutPlan p = planCache.computeIfAbsent(s.getPlanId(), planMapper::selectById);
                if (p != null && p.getType() != null) planType = p.getType();
            }
            total = total.add(MetTable.estimateKcal(s.getDuration(), bodyWeight, planType));
        }

        DailySummary existing = dailySummaryMapper.findByDate(userId, day);
        if (existing == null) {
            if (total.signum() == 0) return;  // 没消耗也没汇总行就别新建空行
            // 先尝试走 DailySummaryService.recompute 把 diet / tdee / target 字段补齐
            try {
                dailySummaryService.recompute(userId, day);
            } catch (Exception ex) {
                // 用户没填资料 → 落最小行兜底
            }
            existing = dailySummaryMapper.findByDate(userId, day);
            if (existing == null) {
                existing = new DailySummary();
                existing.setUserId(userId);
                existing.setSummaryDate(day);
                existing.setExerciseCalories(total);
                dailySummaryMapper.insert(existing);
                return;
            }
        }
        existing.setExerciseCalories(total);
        dailySummaryMapper.updateById(existing);
    }

    /** 自重 set 用用户体重兜底；用户未填体重时返回 0（即不计入 volume） */
    private BigDecimal effectiveWeight(BigDecimal setWeight, BigDecimal bodyWeight) {
        if (setWeight != null && setWeight.signum() > 0) return setWeight;
        return bodyWeight != null ? bodyWeight : BigDecimal.ZERO;
    }

    private BigDecimal getUserBodyWeight(Long userId) {
        User u = userMapper.selectById(userId);
        return u != null ? u.getWeight() : null;
    }

    public List<WorkoutSessionDTO> list(Long userId, int page, int size) {
        int pageSize = Math.max(1, Math.min(size <= 0 ? 20 : size, 100));
        int offset = Math.max(0, (page - 1) * pageSize);
        List<WorkoutSession> sessions = sessionMapper.findByUser(userId, pageSize, offset);
        return inflate(sessions);
    }

    public List<WorkoutSessionDTO> listByDate(Long userId, LocalDate day) {
        if (day == null) return List.of();
        List<WorkoutSession> sessions = sessionMapper.findByUserAndDay(userId, day);
        return inflate(sessions);
    }

    public WorkoutSessionDTO get(Long userId, Long id) {
        WorkoutSession s = sessionMapper.selectById(id);
        if (s == null) throw new BizException(ErrorCode.SESSION_NOT_FOUND);
        if (!s.getUserId().equals(userId)) throw new BizException(ErrorCode.SESSION_NO_PERMISSION);
        return inflate(List.of(s)).get(0);
    }

    public WorkoutSessionDTO getActive(Long userId) {
        WorkoutSession s = sessionMapper.findActive(userId);
        if (s == null) return null;
        return inflate(List.of(s)).get(0);
    }

    @Transactional
    public WorkoutSessionDTO create(Long userId, SaveSessionRequest req) {
        WorkoutSession s = new WorkoutSession();
        // id auto-generated by DB (BIGSERIAL)
        s.setUserId(userId);
        s.setPlanId(req.getPlanId());
        s.setName(req.getName());
        // 状态机：planned / in_progress / completed / abandoned（与 V10 schema 一致）
        s.setStatus(req.getStatus() != null ? req.getStatus() : "planned");
        s.setStartTime(req.getStartTime() != null ? req.getStartTime() : LocalDateTime.now());
        s.setEndTime(req.getEndTime());
        s.setDuration(req.getDuration());
        s.setTotalVolume(req.getTotalVolume() != null ? req.getTotalVolume() : BigDecimal.ZERO);
        s.setNotes(req.getNotes());
        s.setTabId(req.getTabId());
        s.setSource(req.getSource() != null ? req.getSource() : "manual");
        s.setRawText(req.getRawText());
        sessionMapper.insert(s);

        saveExercises(s.getId(), req.getExercises());
        // 若以 completed 状态直接落库（quick_log 走这条路径），同步触发统计 + 当日运动消耗
        if ("completed".equals(s.getStatus())) {
            recomputeStatsForCompletedSession(userId, s.getId());
            recomputeDailyExerciseCalories(userId, sessionDay(s));
        }
        return get(userId, s.getId());
    }

    @Transactional
    public WorkoutSessionDTO update(Long userId, Long id, SaveSessionRequest req) {
        WorkoutSession s = sessionMapper.selectById(id);
        if (s == null) throw new BizException(ErrorCode.SESSION_NOT_FOUND);
        if (!s.getUserId().equals(userId)) throw new BizException(ErrorCode.SESSION_NO_PERMISSION);

        boolean wasCompleted = "completed".equals(s.getStatus());
        LocalDate oldDay = sessionDay(s);  // 改 end_time 前先记下

        if (req.getName() != null) s.setName(req.getName());
        if (req.getStatus() != null) s.setStatus(req.getStatus());
        if (req.getStartTime() != null) s.setStartTime(req.getStartTime());
        if (req.getEndTime() != null) s.setEndTime(req.getEndTime());
        if (req.getDuration() != null) s.setDuration(req.getDuration());
        if (req.getTotalVolume() != null) s.setTotalVolume(req.getTotalVolume());
        if (req.getNotes() != null) s.setNotes(req.getNotes());
        if (req.getTabId() != null) s.setTabId(req.getTabId());
        if (req.getSource() != null) s.setSource(req.getSource());
        if (req.getRawText() != null) s.setRawText(req.getRawText());
        sessionMapper.updateById(s);

        if (req.getExercises() != null) {
            clearExercises(id);
            saveExercises(id, req.getExercises());
        }

        boolean stillCompleted = "completed".equals(s.getStatus());
        LocalDate newDay = sessionDay(s);

        // 已完成会话被编辑、或从 completed 切回其他状态 → 都需要重算 stats + PR
        // （单看 stillCompleted 会漏掉「completed → in_progress」的回滚场景）
        if (wasCompleted || stillCompleted) {
            recomputeStatsForCompletedSession(userId, id);
            // 当日运动消耗：oldDay 和 newDay 都要重算（end_time 跨日 / 状态切换都覆盖）
            recomputeDailyExerciseCalories(userId, oldDay);
            if (newDay != null && !newDay.equals(oldDay)) {
                recomputeDailyExerciseCalories(userId, newDay);
            }
        }
        return get(userId, id);
    }

    /**
     * 已完成会话的 totalVolume 回算 + 全量 stats/PR 重算。
     * 当前 session 仍为 completed 时回写 totalVolume；从 completed 切回 in_progress 时跳过 totalVolume，
     * 但仍跑 recomputeForUser 让 stats / PR 反映新的「completed session 集合」。
     */
    private void recomputeStatsForCompletedSession(Long userId, Long sessionId) {
        WorkoutSession s = sessionMapper.selectById(sessionId);
        if (s != null && "completed".equals(s.getStatus())) {
            List<ExerciseSession> exs = exerciseSessionMapper.findBySession(sessionId);
            List<Long> exIds = exs.stream().map(ExerciseSession::getId).collect(Collectors.toList());
            Map<Long, List<CompletedSet>> setsByEx = completedSetMapper.findByExerciseSessionIds(exIds).stream()
                    .collect(Collectors.groupingBy(CompletedSet::getExerciseSessionId));

            BigDecimal bodyWeight = getUserBodyWeight(userId);
            BigDecimal totalVolume = BigDecimal.ZERO;
            for (ExerciseSession ex : exs) {
                for (CompletedSet cs : setsByEx.getOrDefault(ex.getId(), List.of())) {
                    if (!Boolean.TRUE.equals(cs.getIsCompleted())) continue;
                    BigDecimal w = effectiveWeight(cs.getWeight(), bodyWeight);
                    int reps = cs.getReps() == null ? 0 : cs.getReps();
                    totalVolume = totalVolume.add(w.multiply(BigDecimal.valueOf(reps)));
                }
            }
            if (totalVolume.compareTo(s.getTotalVolume() == null ? BigDecimal.ZERO : s.getTotalVolume()) != 0) {
                s.setTotalVolume(totalVolume);
                sessionMapper.updateById(s);
            }
        }
        // 用户总览统计 + 该用户所有 PR 全量重算
        userStatsService.recomputeForUser(userId);
    }

    /** 取 session 归属日（end_time 优先，缺失退到 start_time） */
    private LocalDate sessionDay(WorkoutSession s) {
        LocalDateTime ref = s.getEndTime() != null ? s.getEndTime() : s.getStartTime();
        return ref != null ? ref.toLocalDate() : null;
    }

    /** 完成训练：计算 totalVolume + PR，同时更新全局 stats */
    @Transactional
    public FinishSessionResponse finish(Long userId, Long id, FinishSessionRequest req) {
        WorkoutSession s = sessionMapper.selectById(id);
        if (s == null) throw new BizException(ErrorCode.SESSION_NOT_FOUND);
        if (!s.getUserId().equals(userId)) throw new BizException(ErrorCode.SESSION_NO_PERMISSION);
        if ("completed".equals(s.getStatus()) || "abandoned".equals(s.getStatus())) {
            throw new BizException(ErrorCode.SESSION_ALREADY_FINISHED);
        }

        LocalDateTime end = req.getEndTime() != null ? req.getEndTime() : LocalDateTime.now();
        Integer duration = req.getDuration();
        if (duration == null && s.getStartTime() != null) {
            duration = (int) java.time.Duration.between(s.getStartTime(), end).getSeconds();
        }

        List<ExerciseSession> exs = exerciseSessionMapper.findBySession(id);
        List<Long> exIds = exs.stream().map(ExerciseSession::getId).collect(Collectors.toList());
        Map<Long, Exercise> exerciseMap = exerciseMapForSessions(exs);
        Map<Long, List<CompletedSet>> setsByEx = completedSetMapper.findByExerciseSessionIds(exIds).stream()
                .collect(Collectors.groupingBy(CompletedSet::getExerciseSessionId));

        BigDecimal bodyWeight = getUserBodyWeight(userId);
        BigDecimal totalVolume = BigDecimal.ZERO;
        Map<Long, BigDecimal> maxWeightByExercise = new HashMap<>();
        for (ExerciseSession ex : exs) {
            for (CompletedSet cs : setsByEx.getOrDefault(ex.getId(), List.of())) {
                if (!Boolean.TRUE.equals(cs.getIsCompleted())) continue;
                BigDecimal raw = cs.getWeight() == null ? BigDecimal.ZERO : cs.getWeight();
                BigDecimal effective = effectiveWeight(raw, bodyWeight);
                int reps = cs.getReps() == null ? 0 : cs.getReps();
                totalVolume = totalVolume.add(effective.multiply(BigDecimal.valueOf(reps)));
                // PR 仍按真实记录的负重，不被体重替换
                if (raw.signum() > 0) {
                    maxWeightByExercise.merge(ex.getExerciseId(), raw,
                            (a, b) -> a.compareTo(b) >= 0 ? a : b);
                }
            }
        }

        s.setStatus("completed");
        s.setEndTime(end);
        s.setDuration(duration);
        s.setTotalVolume(totalVolume);
        if (req.getNotes() != null) s.setNotes(req.getNotes());
        sessionMapper.updateById(s);

        // 训练 → 当日运动消耗（当前差额依赖项）；走 user+day 全量重算，幂等
        recomputeDailyExerciseCalories(userId, sessionDay(s));

        List<UserStatsService.ExerciseMaxWeight> maxList = maxWeightByExercise.entrySet().stream()
                .map(e -> new UserStatsService.ExerciseMaxWeight(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
        Map<Long, UserStatsResponse.PRValue> newPRs =
                userStatsService.recordSessionFinish(userId, id, totalVolume, end, maxList);

        FinishSessionResponse resp = new FinishSessionResponse();
        resp.setSession(get(userId, id));
        resp.setNewPersonalRecords(newPRs);
        return resp;
    }

    @Transactional
    public WorkoutSessionDTO abort(Long userId, Long id) {
        WorkoutSession s = sessionMapper.selectById(id);
        if (s == null) throw new BizException(ErrorCode.SESSION_NOT_FOUND);
        if (!s.getUserId().equals(userId)) throw new BizException(ErrorCode.SESSION_NO_PERMISSION);
        // schema 注释里写的是 abandoned（不是 aborted）—— 与 V10 保持一致
        s.setStatus("abandoned");
        s.setEndTime(LocalDateTime.now());
        sessionMapper.updateById(s);
        return get(userId, id);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        WorkoutSession s = sessionMapper.selectById(id);
        if (s == null) throw new BizException(ErrorCode.SESSION_NOT_FOUND);
        if (!s.getUserId().equals(userId)) throw new BizException(ErrorCode.SESSION_NO_PERMISSION);
        boolean wasCompleted = "completed".equals(s.getStatus());
        LocalDate day = sessionDay(s);  // 删之前先记下归属日
        sessionMapper.deleteById(id);
        // 删除已完成会话后全量重算 stats + PR + 当日运动消耗，避免留下孤儿数据
        if (wasCompleted) {
            userStatsService.recomputeForUser(userId);
            recomputeDailyExerciseCalories(userId, day);
        }
    }

    // ------------- 内部辅助 -------------

    private void clearExercises(Long sessionId) {
        // 级联删除 completed_set 由 ON DELETE CASCADE 走外键自动完成
        exerciseSessionMapper.deleteBySession(sessionId);
    }

    private void saveExercises(Long sessionId, List<ExerciseSessionDTO> items) {
        if (items == null) return;
        int order = 0;
        for (ExerciseSessionDTO dto : items) {
            ExerciseSession ex = new ExerciseSession();
            ex.setSessionId(sessionId);
            ex.setExerciseId(dto.getExerciseId());
            ex.setPlannedSets(dto.getPlannedSets() != null ? dto.getPlannedSets() : 0);
            ex.setNotes(dto.getNotes());
            ex.setSortOrder(order++);
            exerciseSessionMapper.insert(ex);

            if (dto.getCompletedSets() != null) {
                for (CompletedSetDTO set : dto.getCompletedSets()) {
                    CompletedSet cs = new CompletedSet();
                    cs.setExerciseSessionId(ex.getId());
                    cs.setSetNumber(set.getSetNumber() != null ? set.getSetNumber() : 0);
                    cs.setReps(set.getReps() != null ? set.getReps() : 0);
                    cs.setWeight(set.getWeight() != null ? set.getWeight() : BigDecimal.ZERO);
                    cs.setRpe(set.getRpe());
                    cs.setIsCompleted(Boolean.TRUE.equals(set.getIsCompleted()));
                    cs.setCompletedAt(set.getCompletedAt());
                    completedSetMapper.insert(cs);
                }
            }
        }
    }


    private Map<Long, Exercise> exerciseMapForSessions(List<ExerciseSession> exs) {
        if (exs == null || exs.isEmpty()) return Map.of();
        List<Long> exerciseIds = exs.stream()
                .map(ExerciseSession::getExerciseId)
                .filter(id -> id != null)
                .distinct()
                .collect(Collectors.toList());
        if (exerciseIds.isEmpty()) return Map.of();
        return exerciseMapper.selectBatchIds(exerciseIds).stream()
                .collect(Collectors.toMap(Exercise::getId, e -> e));
    }

    private List<WorkoutSessionDTO> inflate(List<WorkoutSession> sessions) {
        if (sessions.isEmpty()) return List.of();
        List<Long> sessionIds = sessions.stream().map(WorkoutSession::getId).collect(Collectors.toList());
        List<ExerciseSession> exs = exerciseSessionMapper.findBySessionIds(sessionIds);
        Map<Long, List<ExerciseSession>> exBySession = exs.stream()
                .collect(Collectors.groupingBy(ExerciseSession::getSessionId));
        List<Long> exIds = exs.stream().map(ExerciseSession::getId).collect(Collectors.toList());
        Map<Long, Exercise> exerciseMap = exerciseMapForSessions(exs);
        Map<Long, List<CompletedSet>> setsByEx = completedSetMapper.findByExerciseSessionIds(exIds).stream()
                .collect(Collectors.groupingBy(CompletedSet::getExerciseSessionId));

        List<WorkoutSessionDTO> out = new ArrayList<>();
        for (WorkoutSession s : sessions) {
            WorkoutSessionDTO d = new WorkoutSessionDTO();
            d.setId(s.getId());
            d.setPlanId(s.getPlanId());
            d.setName(s.getName());
            d.setStatus(s.getStatus());
            d.setStartTime(s.getStartTime());
            d.setEndTime(s.getEndTime());
            d.setDuration(s.getDuration());
            d.setTotalVolume(s.getTotalVolume());
            d.setNotes(s.getNotes());
            d.setTabId(s.getTabId());
            d.setSource(s.getSource());
            d.setRawText(s.getRawText());
            d.setCreatedAt(s.getCreatedAt());
            d.setUpdatedAt(s.getUpdatedAt());

            List<ExerciseSessionDTO> exDtos = new ArrayList<>();
            for (ExerciseSession ex : exBySession.getOrDefault(s.getId(), Collections.emptyList())) {
                ExerciseSessionDTO ed = new ExerciseSessionDTO();
                ed.setExerciseId(ex.getExerciseId());
                Exercise exercise = exerciseMap.get(ex.getExerciseId());
                if (exercise != null) {
                    ed.setExerciseName(exercise.getName());
                    ed.setBodyPart(exercise.getBodyPart());
                }
                ed.setPlannedSets(ex.getPlannedSets());
                ed.setNotes(ex.getNotes());
                List<CompletedSetDTO> setDtos = new ArrayList<>();
                for (CompletedSet cs : setsByEx.getOrDefault(ex.getId(), Collections.emptyList())) {
                    CompletedSetDTO sd = new CompletedSetDTO();
                    sd.setSetNumber(cs.getSetNumber());
                    sd.setReps(cs.getReps());
                    sd.setWeight(cs.getWeight());
                    sd.setRpe(cs.getRpe());
                    sd.setIsCompleted(Boolean.TRUE.equals(cs.getIsCompleted()));
                    sd.setCompletedAt(cs.getCompletedAt());
                    setDtos.add(sd);
                }
                ed.setCompletedSets(setDtos);
                exDtos.add(ed);
            }
            d.setExercises(exDtos);
            out.add(d);
        }
        return out;
    }

}
