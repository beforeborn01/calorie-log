package com.calorielog.module.user.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdateProfileRequest {
    @Size(max = 50)
    private String nickname;

    @Size(max = 500)
    private String avatarUrl;

    @Min(0) @Max(2)
    private Integer gender;

    @Min(1) @Max(120)
    private Integer age;

    private BigDecimal height;
    private BigDecimal weight;

    @Min(1) @Max(4)
    private Integer activityLevel;

    private String timezone;
}
