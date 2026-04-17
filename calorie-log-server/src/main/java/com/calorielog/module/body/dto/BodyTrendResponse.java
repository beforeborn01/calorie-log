package com.calorielog.module.body.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class BodyTrendResponse {
    private LocalDate startDate;
    private LocalDate endDate;
    private List<BodyRecordResponse> records;
    private BigDecimal weightChange;
    private BigDecimal bodyFatChange;
}
