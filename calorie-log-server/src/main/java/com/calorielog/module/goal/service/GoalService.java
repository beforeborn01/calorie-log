package com.calorielog.module.goal.service;

import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.module.goal.dto.GoalResponse;
import com.calorielog.module.goal.dto.SetGoalRequest;
import com.calorielog.module.goal.dto.TrainingScheduleRequest;
import com.calorielog.module.goal.dto.TrainingScheduleResponse;
import com.calorielog.module.goal.entity.TrainingException;
import com.calorielog.module.goal.entity.TrainingRule;
import com.calorielog.module.goal.entity.UserGoal;
import com.calorielog.module.goal.mapper.TrainingExceptionMapper;
import com.calorielog.module.goal.mapper.TrainingRuleMapper;
import com.calorielog.module.goal.mapper.UserGoalMapper;
import com.calorielog.module.user.entity.User;
import com.calorielog.module.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GoalService {

    private final UserGoalMapper userGoalMapper;
    private final UserMapper userMapper;
    private final TrainingRuleMapper trainingRuleMapper;
    private final TrainingExceptionMapper trainingExceptionMapper;
    private final TdeeCalculationService tdeeCalculationService;
    private final TrainingScheduleService trainingScheduleService;

    @Transactional
    public GoalResponse setGoal(Long userId, SetGoalRequest req) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BizException(ErrorCode.USER_NOT_FOUND);
        TdeeCalculationService.GoalCalculation calc =
                tdeeCalculationService.computeForGoal(user, req.getGoalType());

        // 失活旧目标
        UpdateWrapper<UserGoal> uw = new UpdateWrapper<>();
        uw.eq("user_id", userId).eq("is_active", true)
                .set("is_active", false)
                .set("ended_at", LocalDateTime.now());
        userGoalMapper.update(null, uw);

        UserGoal g = new UserGoal();
        g.setUserId(userId);
        g.setGoalType(req.getGoalType());
        g.setBmr(calc.bmr);
        g.setTdeeBase(calc.tdeeBase);
        g.setTargetCaloriesTraining(
                req.getTargetCaloriesTraining() != null ? req.getTargetCaloriesTraining() : calc.targetCaloriesTraining);
        g.setTargetCaloriesRest(
                req.getTargetCaloriesRest() != null ? req.getTargetCaloriesRest() : calc.targetCaloriesRest);
        g.setProteinRatio(req.getProteinRatio() != null ? req.getProteinRatio() : calc.proteinRatio);
        g.setCarbRatio(req.getCarbRatio() != null ? req.getCarbRatio() : calc.carbRatio);
        g.setFatRatio(req.getFatRatio() != null ? req.getFatRatio() : calc.fatRatio);
        g.setIsActive(true);
        g.setStartedAt(LocalDateTime.now());
        userGoalMapper.insert(g);
        return GoalResponse.of(g);
    }

    public GoalResponse getCurrent(Long userId) {
        UserGoal g = userGoalMapper.findActiveByUser(userId);
        if (g == null) throw new BizException(ErrorCode.GOAL_NOT_FOUND);
        return GoalResponse.of(g);
    }

    public UserGoal findActiveOrNull(Long userId) {
        return userGoalMapper.findActiveByUser(userId);
    }

    @Transactional
    public void saveTrainingSchedule(Long userId, TrainingScheduleRequest req) {
        // rule
        TrainingRule rule = trainingRuleMapper.findByUser(userId);
        Integer[] weekdays = req.getTrainingWeekdays() == null ? new Integer[0]
                : req.getTrainingWeekdays().toArray(new Integer[0]);
        if (rule == null) {
            rule = new TrainingRule();
            rule.setUserId(userId);
            rule.setTrainingWeekdays(weekdays);
            rule.setDefaultIntensity(req.getDefaultIntensity() != null ? req.getDefaultIntensity() : 2);
            rule.setEffectiveFrom(LocalDate.now());
            trainingRuleMapper.insert(rule);
        } else {
            rule.setTrainingWeekdays(weekdays);
            if (req.getDefaultIntensity() != null) rule.setDefaultIntensity(req.getDefaultIntensity());
            trainingRuleMapper.updateById(rule);
        }

        // exceptions: upsert per date
        if (req.getExceptions() != null) {
            for (TrainingScheduleRequest.Exception e : req.getExceptions()) {
                if (e.getExceptionDate() == null || e.getDayType() == null) continue;
                TrainingException existing = trainingExceptionMapper.findByDate(userId, e.getExceptionDate());
                if (existing == null) {
                    TrainingException te = new TrainingException();
                    te.setUserId(userId);
                    te.setExceptionDate(e.getExceptionDate());
                    te.setDayType(e.getDayType());
                    te.setTrainingIntensity(e.getTrainingIntensity());
                    te.setNote(e.getNote());
                    trainingExceptionMapper.insert(te);
                } else {
                    existing.setDayType(e.getDayType());
                    existing.setTrainingIntensity(e.getTrainingIntensity());
                    existing.setNote(e.getNote());
                    trainingExceptionMapper.updateById(existing);
                }
            }
        }
    }

    public TrainingScheduleResponse getTrainingSchedule(Long userId, YearMonth yearMonth) {
        TrainingRule rule = trainingRuleMapper.findByUser(userId);
        LocalDate from = yearMonth.atDay(1);
        LocalDate to = yearMonth.atEndOfMonth();
        List<TrainingException> exceptions = trainingExceptionMapper.findInRange(userId, from, to);
        Map<LocalDate, TrainingException> byDate = exceptions.stream()
                .collect(Collectors.toMap(TrainingException::getExceptionDate, e -> e));

        TrainingScheduleResponse resp = new TrainingScheduleResponse();
        if (rule != null) {
            resp.setTrainingWeekdays(rule.getTrainingWeekdays() == null ? List.of()
                    : List.of(rule.getTrainingWeekdays()));
            resp.setDefaultIntensity(rule.getDefaultIntensity());
        } else {
            resp.setTrainingWeekdays(List.of());
            resp.setDefaultIntensity(2);
        }

        List<TrainingScheduleResponse.DayPlan> plan = new ArrayList<>();
        LocalDate d = from;
        while (!d.isAfter(to)) {
            TrainingScheduleResponse.DayPlan dp = new TrainingScheduleResponse.DayPlan();
            dp.setDate(d);
            TrainingException e = byDate.get(d);
            if (e != null) {
                dp.setDayType(e.getDayType());
                dp.setTrainingIntensity(e.getTrainingIntensity());
                dp.setOverridden(true);
            } else {
                TrainingScheduleService.DayInfo info = trainingScheduleService.resolve(userId, d);
                dp.setDayType(info.trainingDay ? 1 : 2);
                dp.setTrainingIntensity(info.intensity);
                dp.setOverridden(false);
            }
            plan.add(dp);
            d = d.plusDays(1);
        }
        resp.setPlan(plan);
        return resp;
    }
}
