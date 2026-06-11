package com.calorielog.module.training.exercise.dto;

import com.calorielog.module.strength.entity.ExerciseSection;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ExerciseDTO {
    private Long id;
    private String name;
    /** 英文分类码（chest/back/legs/...），用于 UI 分组与筛选 */
    private String category;
    /** 中文部位标签，用于 UI 展示 */
    private String bodyPart;
    private List<String> primaryMuscles;
    private List<String> secondaryMuscles;
    private Integer difficulty;
    private String instructions;
    private String tips;
    private Boolean isCustom;
    private Boolean isPopular;
    /** 动作演示图 URL（可空） */
    private String imageUrl;

    /** 粗粒度器械（筛选维度）：自重/杠铃/哑铃/史密斯/器械/绳索/弹力带/小工具/跑步机... */
    private String equipment;
    /** 细粒度器械（展示）：壶铃/药球/波速球...，可空 */
    private String equipmentDetail;
    /** 目标肌（如"中下胸"） */
    private String targetMuscle;
    /** 代谢当量 MET */
    private BigDecimal met;
    /** 结构化详情：步骤 / 呼吸 / 动作感觉 / 常见问题 */
    private List<ExerciseSection> detailSections;
    /** 所属小类中文名（如 ["上胸","中下胸"]），详情带出 */
    private List<String> subRegions;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
