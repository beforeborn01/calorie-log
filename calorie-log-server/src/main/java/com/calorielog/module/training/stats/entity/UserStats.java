package com.calorielog.module.training.stats.entity;

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
@TableName("t_user_stats")
public class UserStats {
    @TableId(value = "user_id", type = IdType.INPUT)
    private Long userId;

    private Integer totalWorkouts;
    private BigDecimal totalVolume;
    private Integer currentStreak;
    private Integer longestStreak;
    private BigDecimal weeklyAverage;
    private LocalDateTime lastWorkoutDate;

    @Version
    private Integer version;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
