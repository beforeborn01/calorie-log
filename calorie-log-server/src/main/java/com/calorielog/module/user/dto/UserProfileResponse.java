package com.calorielog.module.user.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class UserProfileResponse {
    private Long id;
    private String phone;            // 脱敏
    private String email;            // 脱敏
    private String nickname;
    private String avatarUrl;
    private Integer gender;
    private Integer age;
    private BigDecimal height;
    private BigDecimal weight;
    private Integer activityLevel;
    private String timezone;
    private boolean profileComplete;
    private boolean wechatBound;
}
