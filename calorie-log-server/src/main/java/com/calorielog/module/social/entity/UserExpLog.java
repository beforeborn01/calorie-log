package com.calorielog.module.social.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_user_exp_log")
public class UserExpLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Integer expChange;
    private String reasonCode;
    private String reasonDetail;
    private LocalDateTime createdAt;
}
