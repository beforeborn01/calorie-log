package com.calorielog.module.body.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class BodyRecordResponse {
    private Long id;
    private LocalDate recordDate;
    private BigDecimal weight;
    private BigDecimal bodyFat;
}
