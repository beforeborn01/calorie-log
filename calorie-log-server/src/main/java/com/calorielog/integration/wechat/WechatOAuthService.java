package com.calorielog.integration.wechat;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * 微信登录 OAuth 封装。
 * 生产环境接入 WxJava 库调用微信 API；dev 环境走 mock，便于前端联调。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WechatOAuthService {

    @Value("${wechat.mp.app-id:}")
    private String appId;

    @Value("${wechat.mp.app-secret:}")
    private String appSecret;

    @Value("${spring.profiles.active:prod}")
    private String profile;

    public WechatUserInfo exchangeCode(String code) {
        if ("dev".equals(profile) && (appId == null || appId.isBlank())) {
            log.info("[MOCK] wechat exchange code={} -> openid=mock-openid-{}", code, code);
            WechatUserInfo info = new WechatUserInfo();
            info.setOpenid("mock-openid-" + code);
            info.setUnionid("mock-unionid-" + code);
            info.setNickname("微信用户");
            info.setAvatarUrl(null);
            return info;
        }
        // TODO: 集成 WxJava
        //   WxMpService service = new WxMpServiceImpl();
        //   WxMpOAuth2AccessToken token = service.getOAuth2Service().getAccessToken(code);
        //   WxOAuth2UserInfo user = service.getOAuth2Service().getUserInfo(token, null);
        throw new UnsupportedOperationException("WxJava integration not implemented yet");
    }

    @Data
    public static class WechatUserInfo {
        private String openid;
        private String unionid;
        private String nickname;
        private String avatarUrl;
    }
}
