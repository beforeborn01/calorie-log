package com.calorielog.module.social.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_friendship")
public class Friendship {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private Long friendId;
    private String remark;
    private LocalDateTime createdAt;

    @TableLogic(value = "null", delval = "CURRENT_TIMESTAMP")
    @TableField(select = false)
    private LocalDateTime deletedAt;
}
