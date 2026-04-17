package com.calorielog.module.food.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateFoodRequest {
    @NotBlank(message = "名称不能为空")
    private String name;

    private String alias;
    private String category;

    @NotNull @PositiveOrZero
    private BigDecimal calories;

    @PositiveOrZero
    private BigDecimal protein;
    @PositiveOrZero
    private BigDecimal carbohydrate;
    @PositiveOrZero
    private BigDecimal fat;
    @PositiveOrZero
    private BigDecimal dietaryFiber;
    @PositiveOrZero
    private BigDecimal addedSugar;

    private Boolean isHardToWeigh;
    private BigDecimal grossNetRatio;
    private String barcode;
}
