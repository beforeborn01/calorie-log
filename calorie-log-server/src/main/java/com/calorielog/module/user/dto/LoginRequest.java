package com.calorielog.module.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank(message = "手机号/邮箱不能为空")
    private String identifier;

    /** 登录方式：password 或 code */
    @NotBlank(message = "登录方式不能为空")
    private String loginType;

    /** 密码登录时必填 */
    private String password;

    /** 验证码登录时必填 */
    private String verifyCode;
}
