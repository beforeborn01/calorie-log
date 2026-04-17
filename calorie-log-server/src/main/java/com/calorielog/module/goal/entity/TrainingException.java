package com.calorielog.module.goal.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("t_training_exception")
public class TrainingException {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private LocalDate exceptionDate;
    /** 1训练日 2休息日 */
    private Integer dayType;
    /** 覆盖该日训练强度 1低 2中 3高 */
    private Integer trainingIntensity;
    private String note;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
