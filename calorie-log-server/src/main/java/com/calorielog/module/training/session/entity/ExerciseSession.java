package com.calorielog.module.training.session.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("t_exercise_session")
public class ExerciseSession {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long sessionId;
    private Long exerciseId;
    private Integer plannedSets;
    private String notes;
    private Integer sortOrder;
}
