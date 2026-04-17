package com.calorielog.module.user.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class WechatQrCodeResponse {
    /** 轮询用 ticket */
    private String ticket;
    /** 二维码图片 URL（dev 下指向 mock-confirm，真实环境指向微信 URL） */
    private String qrCodeUrl;
    /** dev 标记 */
    private Boolean mocked;
    private LocalDateTime expiresAt;
}
