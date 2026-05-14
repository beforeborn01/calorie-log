package com.calorielog.module.training.session.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class CompletedSetDTO {
    private Integer setNumber;
    private Integer reps;
    private BigDecimal weight;
    private Integer rpe;
    private Boolean isCompleted;
    private LocalDateTime completedAt;
}
