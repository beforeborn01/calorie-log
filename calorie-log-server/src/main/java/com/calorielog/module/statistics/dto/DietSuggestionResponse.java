package com.calorielog.module.statistics.dto;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class DietSuggestionResponse {
    private LocalDate date;
    private List<Suggestion> suggestions;

    @Data
    public static class Suggestion {
        /** calorie / nutrient / meal_distribution / variety */
        private String category;
        /** info / warn / critical */
        private String severity;
        private String title;
        private String detail;
        /** 可选：推荐食物名称列表 */
        private List<String> recommendedFoods;
    }
}
