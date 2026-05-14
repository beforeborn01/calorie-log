package com.calorielog.module.training.plan.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class WorkoutExerciseDTO {
    private Long exerciseId;
    private Integer sets;
    private Integer reps;
    private BigDecimal weight;
    private Integer restSeconds;
    private String notes;
    private Integer order;
}
