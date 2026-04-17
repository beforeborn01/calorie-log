package com.calorielog.module.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResetPasswordRequest {
    @NotBlank
    private String identifier;

    @NotBlank
    @Size(min = 4, max = 8)
    private String verifyCode;

    @NotBlank
    @Size(min = 8, max = 32)
    private String newPassword;
}
