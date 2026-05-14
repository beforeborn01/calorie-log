package com.calorielog.module.training.stats.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("t_personal_record")
public class PersonalRecord {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private Long exerciseId;
    private BigDecimal weight;
    private LocalDateTime recordedAt;
    private Long sessionId;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
