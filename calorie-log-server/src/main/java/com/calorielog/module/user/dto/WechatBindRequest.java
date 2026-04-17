package com.calorielog.module.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class WechatBindRequest {
    @NotBlank
    private String tempToken;

    @NotBlank
    private String phone;

    @NotBlank
    private String verifyCode;
}
