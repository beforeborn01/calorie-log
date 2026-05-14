package com.calorielog.module.training.session.dto;

import lombok.Data;

import java.util.List;

@Data
public class ExerciseSessionDTO {
    private Long exerciseId;
    private Integer plannedSets;
    private String notes;
    private List<CompletedSetDTO> completedSets;
}
