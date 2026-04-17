package com.calorielog.module.user.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.Version;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("t_user_experience")
public class UserExperience {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long totalExp;
    private Integer level;
    private Integer continuousDays;
    private LocalDate lastRecordDate;

    @Version
    private Integer version;

    private LocalDateTime updatedAt;
}
