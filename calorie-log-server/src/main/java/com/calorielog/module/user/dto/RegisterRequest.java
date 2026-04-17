package com.calorielog.module.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    /** 手机号或邮箱，后端自动识别 */
    @NotBlank(message = "手机号/邮箱不能为空")
    private String identifier;

    @NotBlank(message = "验证码不能为空")
    @Size(min = 4, max = 8, message = "验证码长度不正确")
    private String verifyCode;

    @NotBlank(message = "密码不能为空")
    @Size(min = 8, max = 32, message = "密码长度需 8~32 位")
    private String password;

    private String nickname;
}
