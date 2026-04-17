package com.calorielog.module.user.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WechatLoginResponse {
    /** true=已绑定，直接登录；false=需绑定手机号 */
    private boolean bound;
    private TokenResponse token;
    /** 未绑定时返回临时 Token */
    private String tempToken;
    private String openid;
}
