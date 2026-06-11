package com.calorielog.module.strength.entity;

import lombok.Data;

import java.util.List;

/**
 * 动作详情的一个分节（步骤 / 呼吸 / 动作感觉 / 常见问题）。
 * 对应 t_exercise.detail_sections JSONB 中的每个元素。
 */
@Data
public class ExerciseSection {
    /** 分节标题：步骤 / 呼吸 / 动作感觉 / 常见问题 */
    private String title;
    /** 分节条目（步骤为有序步骤文本，其余为要点文本） */
    private List<String> items;
}
