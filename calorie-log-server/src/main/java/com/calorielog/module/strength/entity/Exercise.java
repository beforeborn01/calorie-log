package com.calorielog.module.strength.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_exercise")
public class Exercise {
    @TableId(type = IdType.AUTO)
    private Long id;

    private String name;
    /** 中文部位标签（用于展示） */
    private String bodyPart;
    /** 是否系统预设（与 isCustom 互补：is_preset=true 时 is_custom=false） */
    private Boolean isPreset;
    /** 用户自建时记录创建者，预设动作为 NULL */
    private Long createdBy;

    /** 英文分类码（chest/back/legs/shoulders/arms/core/cardio/other） */
    private String category;
    /** 主要肌群（逗号分隔） */
    private String primaryMuscles;
    /** 辅助肌群（逗号分隔，可空） */
    private String secondaryMuscles;
    /** 难度 1-5 */
    private Integer difficulty;
    /** 动作说明 */
    private String instructions;
    /** 要点提示 */
    private String tips;
    /** 用户自建 = true，系统预设 = false（与 isPreset 互为反面） */
    private Boolean isCustom;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    @TableLogic(value = "null", delval = "CURRENT_TIMESTAMP")
    @TableField(select = false)
    private LocalDateTime deletedAt;
}
