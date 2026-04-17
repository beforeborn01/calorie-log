package com.calorielog.module.ai.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class RecognizeResponse {
    /** 图片内容 SHA-256 hash，可用于前端幂等 */
    private String imageHash;
    /** 是否来自缓存 */
    private Boolean fromCache;
    /** 是否为 Mock 数据 */
    private Boolean mocked;
    private List<Candidate> candidates;

    @Data
    public static class Candidate {
        /** 识别到的名称 */
        private String name;
        /** 置信度 0~1 */
        private BigDecimal probability;
        /** 已匹配到 t_food 的 id，null 表示未匹配 */
        private Long foodId;
        /** 匹配到食物的每 100g 热量，便于前端展示 */
        private BigDecimal caloriesPer100g;
        /** 匹配到食物的分类 */
        private String category;
        /** 是否需要用户手动选择分量 */
        private Boolean needManualQuantity;
    }
}
