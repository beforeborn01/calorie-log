package com.calorielog.module.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SaveCookingFavoriteRequest {
    @NotBlank
    @Size(max = 100)
    private String foodName;
    @NotBlank
    @Size(max = 50)
    private String cookingMethod;
    /** 完整 Method JSON（前端序列化后原样回传） */
    @NotBlank
    private String content;
}
