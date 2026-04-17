package com.calorielog.module.strength.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class StrengthRecordResponse {
    private Long id;
    private LocalDate recordDate;
    private Long exerciseId;
    private String exerciseName;
    private String bodyPart;
    private Integer sets;
    private Integer repsPerSet;
    private BigDecimal weight;
    private String note;
}
