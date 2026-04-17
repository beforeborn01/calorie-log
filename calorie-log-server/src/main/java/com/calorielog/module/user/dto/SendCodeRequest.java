package com.calorielog.module.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SendCodeRequest {
    @NotBlank(message = "手机号/邮箱不能为空")
    private String identifier;

    /** 业务场景：register / login / reset_password */
    @NotBlank(message = "场景不能为空")
    private String scene;
}
