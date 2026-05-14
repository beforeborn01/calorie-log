package com.calorielog.module.training.exercise.dto;

import lombok.Data;

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
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
