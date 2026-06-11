package com.calorielog.module.training.exercise.dto;

import lombok.Data;

import java.util.List;

/**
 * 动作库目录树：喂小程序选择器的左栏（部位+小类）与器械筛选 chips。
 */
@Data
public class ExerciseCatalogDTO {

    private List<BodyPart> bodyParts;

    /** 大类（部位） */
    @Data
    public static class BodyPart {
        /** 英文码 chest/back/... */
        private String code;
        /** 中文名 胸/背/... */
        private String name;
        /** 该部位动作总数 */
        private Integer count;
        /** 小类（细分），可空 */
        private List<SubRegion> subRegions;
        /** 该部位下出现过的器械（按动作数降序），用于器械 chips */
        private List<Equipment> equipments;
    }

    /** 小类（细分部位） */
    @Data
    public static class SubRegion {
        private Long id;
        private String name;
        private Integer count;
    }

    /** 器械及其在该部位下的动作数 */
    @Data
    public static class Equipment {
        private String name;
        private Integer count;
    }
}
