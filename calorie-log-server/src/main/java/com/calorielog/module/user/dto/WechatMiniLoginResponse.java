package com.calorielog.module.user.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 小程序 wx.login 登录响应（软提醒方案）：
 * 无论用户是否绑过手机号都直接返回 token，前端按 {@link #needBindPhone} 决定是否展示提示横幅。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WechatMiniLoginResponse {
    private TokenResponse token;
    /** true 表示该用户尚未绑定手机号，前端用于软提醒 */
    private boolean needBindPhone;
}
