package com.calorielog.module.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class WechatMiniLoginRequest {

    /** wx.login() 返回的 jscode（5 分钟有效，一次性） */
    @NotBlank
    private String code;
}
