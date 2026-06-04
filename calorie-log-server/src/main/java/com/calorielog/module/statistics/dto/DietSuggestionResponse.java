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
        /**
         * 是否仅在“一整天吃完”后才有意义（缺口/摄入不足/缺餐/种类偏少等）。
         * 进行中的当天前端会隐藏这些，避免白天误报。
         */
        private boolean endOfDayOnly;
    }
}
