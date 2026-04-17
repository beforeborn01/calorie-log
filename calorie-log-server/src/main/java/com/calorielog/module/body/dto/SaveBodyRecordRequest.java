package com.calorielog.module.body.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class SaveBodyRecordRequest {
    @NotNull
    private LocalDate recordDate;

    @DecimalMin("20.0") @DecimalMax("300.0")
    private BigDecimal weight;

    @DecimalMin("1.0") @DecimalMax("80.0")
    private BigDecimal bodyFat;
}
