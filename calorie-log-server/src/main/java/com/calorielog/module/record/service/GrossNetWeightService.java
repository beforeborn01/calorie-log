package com.calorielog.module.record.service;

import com.calorielog.module.food.entity.Food;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class GrossNetWeightService {

    /**
     * 给定毛重 + 食物净毛重比例，换算为净重（g）。
     * netQuantity = grossQuantity × grossNetRatio
     */
    public BigDecimal toNetWeight(BigDecimal gross, Food food) {
        if (gross == null) return null;
        if (food == null || !Boolean.TRUE.equals(food.getIsHardToWeigh()) || food.getGrossNetRatio() == null) {
            return gross;
        }
        return gross.multiply(food.getGrossNetRatio()).setScale(2, RoundingMode.HALF_UP);
    }
}
