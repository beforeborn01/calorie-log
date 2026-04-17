package com.calorielog.module.goal.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.Version;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_user_goal")
public class UserGoal {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    /** 1增肌塑型 2减脂增肌 */
    private Integer goalType;
    private BigDecimal bmr;
    private BigDecimal tdeeBase;
    private BigDecimal targetCaloriesTraining;
    private BigDecimal targetCaloriesRest;
    /** % 蛋白质 */
    private BigDecimal proteinRatio;
    private BigDecimal carbRatio;
    private BigDecimal fatRatio;
    private Boolean isActive;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;

    @Version
    private Integer version;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
