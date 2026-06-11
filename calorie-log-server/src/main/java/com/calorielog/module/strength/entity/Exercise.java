package com.calorielog.module.strength.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@TableName(value = "t_exercise", autoResultMap = true)
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
    /** 动作演示图 URL（远程或本地路径，可空） */
    private String imageUrl;
    /** 常用动作（前端默认筛选） */
    private Boolean isPopular;

    /** 粗粒度器械（自重/杠铃/哑铃/史密斯/器械/绳索/弹力带/小工具/跑步机...）：筛选 + MET 键 */
    private String equipment;
    /** 细粒度器械（壶铃/药球/波速球...，小工具的展开，可空） */
    private String equipmentDetail;
    /** 目标肌（开练 target，如"中下胸"） */
    private String targetMuscle;
    /** 代谢当量 MET，用于 kcal = MET × 体重 × 时长 */
    private BigDecimal met;
    /** 结构化详情：步骤 / 呼吸 / 动作感觉 / 常见问题（JSONB） */
    @TableField(typeHandler = JacksonTypeHandler.class)
    private List<ExerciseSection> detailSections;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    @TableLogic(value = "null", delval = "CURRENT_TIMESTAMP")
    @TableField(select = false)
    private LocalDateTime deletedAt;
}
