package com.calorielog.module.goal.service;

import com.calorielog.module.goal.entity.TrainingException;
import com.calorielog.module.goal.entity.TrainingRule;
import com.calorielog.module.goal.mapper.TrainingExceptionMapper;
import com.calorielog.module.goal.mapper.TrainingRuleMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Arrays;

/**
 * 判断某一天是训练日还是休息日 + 训练强度。先查例外表，无则按规则表推断。
 */
@Service
@RequiredArgsConstructor
public class TrainingScheduleService {

    private final TrainingRuleMapper trainingRuleMapper;
    private final TrainingExceptionMapper trainingExceptionMapper;

    public DayInfo resolve(Long userId, LocalDate date) {
        TrainingException exception = trainingExceptionMapper.findByDate(userId, date);
        if (exception != null) {
            DayInfo info = new DayInfo();
            info.trainingDay = exception.getDayType() != null && exception.getDayType() == 1;
            info.intensity = exception.getTrainingIntensity() != null ? exception.getTrainingIntensity() : 2;
            info.overridden = true;
            return info;
        }
        TrainingRule rule = trainingRuleMapper.findByUser(userId);
        DayInfo info = new DayInfo();
        if (rule == null || rule.getTrainingWeekdays() == null) {
            info.trainingDay = false;
            info.intensity = 2;
        } else {
            int dayOfWeek = DayOfWeek.from(date).getValue();  // 1=Mon ... 7=Sun
            boolean match = Arrays.stream(rule.getTrainingWeekdays())
                    .anyMatch(d -> d != null && d == dayOfWeek);
            info.trainingDay = match;
            info.intensity = rule.getDefaultIntensity() != null ? rule.getDefaultIntensity() : 2;
        }
        info.overridden = false;
        return info;
    }

    public static class DayInfo {
        public boolean trainingDay;
        public int intensity;
        public boolean overridden;
    }
}
