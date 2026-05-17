package com.calorielog.integration.wechat;

import cn.binarywang.wx.miniapp.api.WxMaService;
import cn.binarywang.wx.miniapp.api.impl.WxMaServiceImpl;
import cn.binarywang.wx.miniapp.config.impl.WxMaDefaultConfigImpl;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 微信小程序 (Mini Program) WxJava bean。
 *
 * <p>未配置 wechat.ma.app-id 时仍然会注入 bean，但调用 code2Session 会被微信服务端拒。
 * 我们在 service 层用 isConfigured() 判断后走 mock 分支。</p>
 */
@Configuration
public class WxMaConfig {

    @Value("${wechat.ma.app-id:}")
    private String appId;

    @Value("${wechat.ma.app-secret:}")
    private String appSecret;

    @Bean
    public WxMaService wxMaService() {
        WxMaDefaultConfigImpl cfg = new WxMaDefaultConfigImpl();
        cfg.setAppid(appId == null ? "" : appId);
        cfg.setSecret(appSecret == null ? "" : appSecret);
        WxMaService service = new WxMaServiceImpl();
        service.setWxMaConfig(cfg);
        return service;
    }

    public boolean isConfigured() {
        return appId != null && !appId.isBlank() && appSecret != null && !appSecret.isBlank();
    }
}
