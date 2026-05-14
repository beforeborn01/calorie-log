package com.calorielog.module.training.session.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_completed_set")
public class CompletedSet {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long exerciseSessionId;
    private Integer setNumber;
    private Integer reps;
    private BigDecimal weight;
    private Integer rpe;
    private Boolean isCompleted;
    private LocalDateTime completedAt;
}
