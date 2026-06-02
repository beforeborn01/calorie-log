package com.calorielog.module.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BindPhoneRequest {
    @NotBlank
    private String phone;

    @NotBlank
    private String verifyCode;
}
