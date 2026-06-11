package com.calorielog.module.training.exercise.dto;

import lombok.Data;

/**
 * catalog 聚合查询的中间行结果（mapper 返回，service 再组装成 {@link ExerciseCatalogDTO}）。
 */
public class ExerciseCatalogRows {

    /** 每个大类的动作计数 */
    @Data
    public static class BodyPartCount {
        private String code;   // category 英文码
        private String name;   // body_part 中文
        private Integer count;
    }

    /** 每个小类的动作计数 */
    @Data
    public static class SubRegionCount {
        private Long id;
        private String bodyPart;  // 所属大类英文码
        private String name;      // 小类中文名
        private Integer count;
    }

    /** 每个 (大类, 器械) 的动作计数 */
    @Data
    public static class EquipmentCount {
        private String bodyPart;  // body_part 中文
        private String name;      // 器械
        private Integer count;
    }
}
