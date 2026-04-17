package com.calorielog.module.record.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateRecordRequest {
    @NotNull
    private LocalDate recordDate;

    /** 1早餐 2午餐 3晚餐 4加餐 */
    @NotNull @Min(1) @Max(4)
    private Integer mealType;

    /** 使用食物库时填 foodId，手动录入时为 null */
    private Long foodId;

    /** 食物名称（手动录入必填；关联 foodId 时可不传，后端取库中名称） */
    private String foodName;

    /** 净重 g */
    @Positive
    private BigDecimal quantity;

    /** 毛重 g，为难称重食物时传入（与 quantity 二选一） */
    private BigDecimal grossQuantity;

    /** 手动录入营养素（无 foodId 时参考） */
    private BigDecimal calories;
    private BigDecimal protein;
    private BigDecimal carbohydrate;
    private BigDecimal fat;
    private BigDecimal dietaryFiber;
    private BigDecimal addedSugar;

    /** 1搜索 2手动 3拍照 4扫码 5收藏 6烹饪推荐 */
    private Integer addMethod;
}
