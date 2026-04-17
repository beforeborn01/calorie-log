package com.calorielog.module.ai.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("t_cooking_favorite")
public class CookingFavorite {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String foodName;
    private String cookingMethod;
    /** 完整方法 JSON（CookingSuggestionResponse.Method 序列化） */
    private String content;
    private LocalDateTime createdAt;

    @TableLogic(value = "null", delval = "CURRENT_TIMESTAMP")
    @TableField(select = false)
    private LocalDateTime deletedAt;
}
