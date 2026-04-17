package com.calorielog.module.goal.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.Version;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName(value = "t_training_rule", autoResultMap = true)
public class TrainingRule {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    /** 训练日星期数组 (1~7)，如 {1,3,5} 表示周一三五 */
    @TableField(typeHandler = com.calorielog.common.mybatis.PgShortArrayTypeHandler.class, jdbcType = org.apache.ibatis.type.JdbcType.ARRAY)
    private Integer[] trainingWeekdays;
    /** 默认训练强度 1低 2中 3高 */
    private Integer defaultIntensity;
    private LocalDate effectiveFrom;

    @Version
    private Integer version;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
