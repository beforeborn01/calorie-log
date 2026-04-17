package com.calorielog.module.record.dto;

import com.calorielog.module.record.entity.DietRecord;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class DietRecordResponse {
    private Long id;
    private LocalDate recordDate;
    private Integer mealType;
    private Long foodId;
    private String foodName;
    private BigDecimal quantity;
    private BigDecimal grossQuantity;
    private BigDecimal calories;
    private BigDecimal protein;
    private BigDecimal carbohydrate;
    private BigDecimal fat;
    private BigDecimal dietaryFiber;
    private BigDecimal addedSugar;
    private Integer addMethod;

    public static DietRecordResponse of(DietRecord r) {
        DietRecordResponse d = new DietRecordResponse();
        d.setId(r.getId());
        d.setRecordDate(r.getRecordDate());
        d.setMealType(r.getMealType());
        d.setFoodId(r.getFoodId());
        d.setFoodName(r.getFoodName());
        d.setQuantity(r.getQuantity());
        d.setGrossQuantity(r.getGrossQuantity());
        d.setCalories(r.getCalories());
        d.setProtein(r.getProtein());
        d.setCarbohydrate(r.getCarbohydrate());
        d.setFat(r.getFat());
        d.setDietaryFiber(r.getDietaryFiber());
        d.setAddedSugar(r.getAddedSugar());
        d.setAddMethod(r.getAddMethod());
        return d;
    }
}
