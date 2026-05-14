package com.calorielog.module.training.quicklog.parser;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/** 单条解析结果：一个动作 + 组数 + 次数 + 可选重量 + 原始片段 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParsedEntry {
    /** 提取到的动作名（中文或英文，未匹配 t_exercise 之前的原文） */
    private String rawName;

    private Integer sets;
    private Integer reps;
    private BigDecimal weight;

    /** 在原文中的对应片段（debug 与 LLM 兜底用） */
    private String snippet;

    /** 解析后匹配到的 exercise id（matcher 阶段填充） */
    private Long exerciseId;

    /** 匹配置信度 0-1（1=精确，0.7+=可信 fuzzy，<0.7 走 LLM） */
    private Double matchConfidence;

    /** LLM 兜底时回填，供自动创建动作使用 */
    private String inferredCategory;
    private List<String> inferredPrimaryMuscles;
}
