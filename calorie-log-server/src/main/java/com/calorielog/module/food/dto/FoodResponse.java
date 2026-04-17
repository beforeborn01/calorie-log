package com.calorielog.module.food.dto;

import com.calorielog.module.food.entity.Food;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class FoodResponse {
    private Long id;
    private String name;
    private String alias;
    private String barcode;
    private String category;
    private String unit;
    private BigDecimal calories;
    private BigDecimal protein;
    private BigDecimal carbohydrate;
    private BigDecimal fat;
    private BigDecimal dietaryFiber;
    private BigDecimal addedSugar;
    private BigDecimal sodium;
    private BigDecimal potassium;
    private BigDecimal calcium;
    private BigDecimal iron;
    private Boolean isHardToWeigh;
    private BigDecimal grossNetRatio;
    private String dataSource;

    public static FoodResponse of(Food f) {
        FoodResponse r = new FoodResponse();
        r.setId(f.getId());
        r.setName(f.getName());
        r.setAlias(f.getAlias());
        r.setBarcode(f.getBarcode());
        r.setCategory(f.getCategory());
        r.setUnit(f.getUnit());
        r.setCalories(f.getCalories());
        r.setProtein(f.getProtein());
        r.setCarbohydrate(f.getCarbohydrate());
        r.setFat(f.getFat());
        r.setDietaryFiber(f.getDietaryFiber());
        r.setAddedSugar(f.getAddedSugar());
        r.setSodium(f.getSodium());
        r.setPotassium(f.getPotassium());
        r.setCalcium(f.getCalcium());
        r.setIron(f.getIron());
        r.setIsHardToWeigh(f.getIsHardToWeigh());
        r.setGrossNetRatio(f.getGrossNetRatio());
        r.setDataSource(f.getDataSource());
        return r;
    }
}
