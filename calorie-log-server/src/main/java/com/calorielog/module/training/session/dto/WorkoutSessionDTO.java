package com.calorielog.module.training.session.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class WorkoutSessionDTO {
    private Long id;
    private Long planId;
    private String name;
    private String status;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer duration;
    private BigDecimal totalVolume;
    private String notes;
    private String tabId;
    private String source;
    private String rawText;
    private List<ExerciseSessionDTO> exercises;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
