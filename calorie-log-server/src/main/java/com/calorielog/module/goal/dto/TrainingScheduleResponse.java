package com.calorielog.module.goal.dto;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class TrainingScheduleResponse {
    private List<Integer> trainingWeekdays;
    private Integer defaultIntensity;
    private List<DayPlan> plan;

    @Data
    public static class DayPlan {
        private LocalDate date;
        /** 1训练日 2休息日 */
        private Integer dayType;
        private Integer trainingIntensity;
        private boolean overridden;  // true 表示由例外覆盖
    }
}
