package com.calorielog.module.goal.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class TrainingScheduleRequest {
    /** 训练日星期数组，1=周一 ~ 7=周日，如 [1,3,5] */
    private List<@Min(1) @Max(7) Integer> trainingWeekdays;

    /** 默认训练强度 1低 2中 3高 */
    @Min(1) @Max(3)
    private Integer defaultIntensity;

    /** 单日例外列表；day_type=1训练 / 2休息 */
    private List<Exception> exceptions;

    @Data
    public static class Exception {
        private LocalDate exceptionDate;
        @Min(1) @Max(2)
        private Integer dayType;
        @Min(1) @Max(3)
        private Integer trainingIntensity;
        private String note;
    }
}
