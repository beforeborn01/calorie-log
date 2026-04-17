package com.calorielog.module.ai.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CookingSuggestionResponse {
    private String foodName;
    /** 用户健身目标类别：bulk / cut / general */
    private String goalType;
    /** 是否命中缓存 */
    private Boolean fromCache;
    /** true=LLM 生成；false=静态兜底 */
    private Boolean llmGenerated;
    private List<Method> methods;

    @Data
    public static class Method {
        /** 方法名，如"清蒸" */
        private String name;
        /** 适配目标标签：bulk / cut / general，可多选 */
        private List<String> fitGoals;
        /** 烹饪步骤（分点） */
        private List<String> steps;
        /** 优势说明 */
        private String advantages;
        /** 估算每 100g 成品热量 */
        private BigDecimal caloriesPer100g;
        /** 估算用油（g/份） */
        private BigDecimal oilPerServingG;
        /** 烹饪时长（分钟） */
        private Integer durationMinutes;
        /** 标签：quick / low_oil / no_smoke */
        private List<String> tags;
    }
}
