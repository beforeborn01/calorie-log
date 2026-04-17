package com.calorielog.module.settings.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@TableName("t_notification_setting")
public class NotificationSetting {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Boolean breakfastEnabled;
    private LocalTime breakfastTime;
    private Boolean lunchEnabled;
    private LocalTime lunchTime;
    private Boolean dinnerEnabled;
    private LocalTime dinnerTime;
    private String frequency;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
