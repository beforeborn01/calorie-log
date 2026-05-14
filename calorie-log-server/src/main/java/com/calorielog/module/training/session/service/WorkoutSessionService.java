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
import com.calorielog.module.training.plan.entity.WorkoutPlan;
import com.calorielog.module.training.plan.mapper.WorkoutPlanMapper;
import com.calorielog.module.training.session.mapper.CompletedSetMapper;
import com.calorielog.module.training.session.mapper.ExerciseSessionMapper;
import com.calorielog.module.training.session.mapper.WorkoutSessionMapper;
import com.calorielog.module.training.stats.dto.UserStatsResponse;
import com.calorielog.module.training.stats.service.UserStatsService;
import com.calorielog.module.user.entity.User;
import com.calorielog.module.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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

    /**
     * 把本次训练的运动消耗累加到当日 t_daily_summary。
     * 公式：kcal = MET(plan.type) × 体重(kg) × 时长(小时)
     * 同一天多次训练 → 累加；用户没填体重按 60kg 兜底；没绑 plan 当 strength 估。
     */
    private void recordExerciseCalories(Long userId, WorkoutSession s) {
        if (s.getDuration() == null || s.getDuration() <= 0) return;
        LocalDateTime end = s.getEndTime() != null ? s.getEndTime() : LocalDateTime.now();
        java.time.LocalDate day = end.toLocalDate();

        String planType = "strength";
        if (s.getPlanId() != null) {
            WorkoutPlan p = planMapper.selectById(s.getPlanId());
            if (p != null && p.getType() != null) planType = p.getType();
        }
        BigDecimal kcal = MetTable.estimateKcal(s.getDuration(), getUserBodyWeight(userId), planType);
        if (kcal.signum() <= 0) return;

        // 先触发 DailySummary 重算（按 t_training_rule 算好 dayType / TDEE / 目标卡），
        // 再把本次训练消耗累加到 exercise_calories。
        // recompute 内部不动 exercise_calories 列，所以累加是安全的。
        try {
            dailySummaryService.recompute(userId, day);
        } catch (Exception ex) {
            // 用户没填资料 → 静默跳过；只写 exercise_calories
        }

        DailySummary existing = dailySummaryMapper.findByDate(userId, day);
        if (existing == null) {
            DailySummary ds = new DailySummary();
            ds.setUserId(userId);
            ds.setSummaryDate(day);
            ds.setExerciseCalories(kcal);
            dailySummaryMapper.insert(ds);
        } else {
            BigDecimal prev = existing.getExerciseCalories() == null ? BigDecimal.ZERO : existing.getExerciseCalories();
            existing.setExerciseCalories(prev.add(kcal));
            dailySummaryMapper.updateById(existing);
        }
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
        s.setStatus(req.getStatus() != null ? req.getStatus() : "active");
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
        // 若以 completed 状态直接落库（quick-log），同步触发统计
        if ("completed".equals(s.getStatus())) {
            recomputeStatsIfCompleted(userId, s.getId());
        }
        return get(userId, s.getId());
    }

    @Transactional
    public WorkoutSessionDTO update(Long userId, Long id, SaveSessionRequest req) {
        WorkoutSession s = sessionMapper.selectById(id);
        if (s == null) throw new BizException(ErrorCode.SESSION_NOT_FOUND);
        if (!s.getUserId().equals(userId)) throw new BizException(ErrorCode.SESSION_NO_PERMISSION);

        boolean wasCompleted = "completed".equals(s.getStatus());

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

        // 已完成会话被编辑 → 重算 totalVolume + PR + UserStats
        boolean stillCompleted = "completed".equals(s.getStatus());
        if (wasCompleted || stillCompleted) {
            recomputeStatsIfCompleted(userId, id);
        }
        return get(userId, id);
    }

    /** 重新汇总已完成会话的 totalVolume 并同步用户统计与 PR */
    private void recomputeStatsIfCompleted(Long userId, Long sessionId) {
        WorkoutSession s = sessionMapper.selectById(sessionId);
        if (s == null || !"completed".equals(s.getStatus())) return;

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
        // 用户总览统计 + 该用户所有 PR 全量重算，避免遗漏
        userStatsService.recomputeForUser(userId);
    }

    /** 完成训练：计算 totalVolume + PR，同时更新全局 stats */
    @Transactional
    public FinishSessionResponse finish(Long userId, Long id, FinishSessionRequest req) {
        WorkoutSession s = sessionMapper.selectById(id);
        if (s == null) throw new BizException(ErrorCode.SESSION_NOT_FOUND);
        if (!s.getUserId().equals(userId)) throw new BizException(ErrorCode.SESSION_NO_PERMISSION);
        if ("completed".equals(s.getStatus()) || "aborted".equals(s.getStatus())) {
            throw new BizException(ErrorCode.SESSION_ALREADY_FINISHED);
        }

        LocalDateTime end = req.getEndTime() != null ? req.getEndTime() : LocalDateTime.now();
        Integer duration = req.getDuration();
        if (duration == null && s.getStartTime() != null) {
            duration = (int) java.time.Duration.between(s.getStartTime(), end).getSeconds();
        }

        List<ExerciseSession> exs = exerciseSessionMapper.findBySession(id);
        List<Long> exIds = exs.stream().map(ExerciseSession::getId).collect(Collectors.toList());
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

        // 训练 → 当日运动消耗（净赤字依赖项）
        recordExerciseCalories(userId, s);

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
        s.setStatus("aborted");
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
        sessionMapper.deleteById(id);
        // 删除已完成会话后全量重算 stats + PR，避免留下孤儿统计
        if (wasCompleted) {
            userStatsService.recomputeForUser(userId);
        }
    }

    // ------------- 内部辅助 -------------

    private void clearExercises(Long sessionId) {
        List<ExerciseSession> exs = exerciseSessionMapper.findBySession(sessionId);
        if (exs.isEmpty()) return;
        // 级联删除 completed_set（外键 ON DELETE CASCADE），再删 exercise_session
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

    private List<WorkoutSessionDTO> inflate(List<WorkoutSession> sessions) {
        if (sessions.isEmpty()) return List.of();
        List<Long> sessionIds = sessions.stream().map(WorkoutSession::getId).collect(Collectors.toList());
        List<ExerciseSession> exs = exerciseSessionMapper.findBySessionIds(sessionIds);
        Map<Long, List<ExerciseSession>> exBySession = exs.stream()
                .collect(Collectors.groupingBy(ExerciseSession::getSessionId));
        List<Long> exIds = exs.stream().map(ExerciseSession::getId).collect(Collectors.toList());
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
