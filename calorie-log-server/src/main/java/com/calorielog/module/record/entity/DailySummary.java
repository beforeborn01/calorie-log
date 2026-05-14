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
    /**
     * 与目标卡的差：totalCalories − targetCalories；正=吃过头、负=吃少了。
     * 注意：与 {@code netDeficit}（在 DailyRecordsResponse 中计算）不同 —
     * netDeficit 是消耗-摄入视角；calorieGap 是和目标的差异视角。两者保留共存。
     */
    private BigDecimal calorieGap;
    private BigDecimal dietScore;
    private Integer foodVarietyCount;

    /** 当日运动总消耗 kcal（来自训练 session 完成） */
    private BigDecimal exerciseCalories;

    @Version
    private Integer version;

    private LocalDateTime updatedAt;
}
