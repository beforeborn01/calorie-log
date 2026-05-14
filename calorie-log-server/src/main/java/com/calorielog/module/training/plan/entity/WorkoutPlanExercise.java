package com.calorielog.module.training.plan.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;

@Data
@TableName("t_workout_plan_exercise")
public class WorkoutPlanExercise {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long planId;
    private Long exerciseId;
    private Integer sets;
    private Integer reps;
    private BigDecimal weight;
    private Integer restSeconds;
    private String notes;
    private Integer sortOrder;
}
