package com.calorielog.module.user.dto;

import lombok.Data;

@Data
public class WechatPollResponse {
    /** PENDING / SCANNED / CONFIRMED / EXPIRED */
    private String status;
    /** CONFIRMED 时返回；其它状态 null */
    private TokenResponse token;
    /** SCANNED / CONFIRMED 时可能返回 nickname（用于 UI 显示"XX 已扫码"） */
    private String nickname;
}
