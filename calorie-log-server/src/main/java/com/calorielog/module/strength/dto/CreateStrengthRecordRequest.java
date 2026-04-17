package com.calorielog.module.strength.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateStrengthRecordRequest {
    @NotNull
    private LocalDate recordDate;

    @NotNull
    private Long exerciseId;

    @NotNull @Min(1) @Max(20)
    private Integer sets;

    @NotNull @Min(1) @Max(100)
    private Integer repsPerSet;

    @DecimalMin("0.0") @DecimalMax("500.0")
    private BigDecimal weight;

    @Size(max = 200)
    private String note;
}
