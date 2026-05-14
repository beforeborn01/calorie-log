package com.calorielog.module.training.plan.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class WorkoutPlanDTO {
    private Long id;
    private String name;
    private String description;
    private String type;
    private Integer estimatedDuration;
    private Boolean isTemplate;
    private List<WorkoutExerciseDTO> exercises;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
