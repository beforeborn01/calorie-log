package com.calorielog.module.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CookingSuggestionRequest {
    /** 食材名称，如"鸡胸肉" */
    @NotBlank
    @Size(max = 50)
    private String foodName;
    /** 可选：low_oil / quick / no_smoke，逗号分隔 */
    private String preferences;
}
