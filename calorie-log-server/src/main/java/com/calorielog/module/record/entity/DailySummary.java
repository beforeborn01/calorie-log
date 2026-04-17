package com.calorielog.module.record.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.Version;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("t_daily_summary")
public class DailySummary {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private LocalDate summaryDate;
    private Integer dayType;
    private BigDecimal totalCalories;
    private BigDecimal totalProtein;
    private BigDecimal totalCarb;
    private BigDecimal totalFat;
    private BigDecimal totalFiber;
    private BigDecimal targetCalories;
    private BigDecimal tdee;
    private BigDecimal calorieGap;
    private BigDecimal dietScore;
    private Integer foodVarietyCount;

    @Version
    private Integer version;

    private LocalDateTime updatedAt;
}
