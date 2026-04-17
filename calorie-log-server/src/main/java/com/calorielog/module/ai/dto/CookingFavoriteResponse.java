package com.calorielog.module.ai.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CookingFavoriteResponse {
    private Long id;
    private String foodName;
    private String cookingMethod;
    /** 完整 Method JSON */
    private String content;
    private LocalDateTime createdAt;
}
