package com.calorielog.module.training.exercise.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class ExerciseDTO {
    private Long id;
    private String name;
    private String category;
    private List<String> primaryMuscles;
    private List<String> secondaryMuscles;
    private Integer difficulty;
    private String instructions;
    private String tips;
    private Boolean isCustom;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
