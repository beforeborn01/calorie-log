package com.calorielog.integration.wechat;

import cn.binarywang.wx.miniapp.api.WxMaService;
import cn.binarywang.wx.miniapp.bean.WxMaJscode2SessionResult;
import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.chanjar.weixin.common.error.WxErrorException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * 微信登录 OAuth 封装。
 *
 * <p>两条入口：</p>
 * <ul>
 *   <li>{@link #exchangeCode(String)} —— 公众号 / 网站应用 OAuth（PC 扫码、H5 网页授权）。</li>
 *   <li>{@link #miniprogramCode2Session(String)} —— 小程序 wx.login 拿到的 jscode 换 openid。</li>
 * </ul>
 *
 * <p>未配置真实凭据时（dev 或 prod 但 app-id 为空）走 mock，便于前端联调。</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WechatOAuthService {

    private final WxMaService wxMaService;
    private final WxMaConfig wxMaConfig;

    @Value("${wechat.mp.app-id:}")
    private String mpAppId;

    @Value("${wechat.mp.app-secret:}")
    private String mpAppSecret;

    @Value("${spring.profiles.active:prod}")
    private String profile;

    public WechatUserInfo exchangeCode(String code) {
        if ("dev".equals(profile) && (mpAppId == null || mpAppId.isBlank())) {
            log.info("[MOCK-MP] wechat exchange code={} -> openid=mock-openid-{}", code, code);
            WechatUserInfo info = new WechatUserInfo();
            info.setOpenid("mock-openid-" + code);
            info.setUnionid("mock-unionid-" + code);
            info.setNickname("微信用户");
            info.setAvatarUrl(null);
            return info;
        }
        // TODO: 集成 WxJava 公众号 OAuth
        //   WxMpService service = new WxMpServiceImpl();
        //   WxMpOAuth2AccessToken token = service.getOAuth2Service().getAccessToken(code);
        //   WxOAuth2UserInfo user = service.getOAuth2Service().getUserInfo(token, null);
        throw new UnsupportedOperationException("WxJava MP integration not implemented yet");
    }

    /**
     * 小程序 wx.login → code2Session。
     *
     * <p>未配置 wechat.ma.app-id 时，dev 环境返回 mock；prod 环境直接抛 BizException
     * 避免真实用户拿到一个永远绑不上的假 openid。</p>
     */
    public WechatUserInfo miniprogramCode2Session(String jsCode) {
        if (!wxMaConfig.isConfigured()) {
            if ("dev".equals(profile)) {
                log.info("[MOCK-MA] miniprogram code={} -> openid=mock-ma-{}", jsCode, jsCode);
                WechatUserInfo info = new WechatUserInfo();
                info.setOpenid("mock-ma-openid-" + jsCode);
                info.setUnionid(null);
                return info;
            }
            log.warn("wechat.ma.app-id 未配置，拒绝小程序登录");
            throw new BizException(ErrorCode.WECHAT_NOT_CONFIGURED);
        }
        try {
            WxMaJscode2SessionResult sess = wxMaService.getUserService().getSessionInfo(jsCode);
            WechatUserInfo info = new WechatUserInfo();
            info.setOpenid(sess.getOpenid());
            info.setUnionid(sess.getUnionid()); // 个人主体没绑开放平台时为 null
            return info;
        } catch (WxErrorException e) {
            log.warn("miniprogram code2Session failed: code={} err={}", jsCode, e.getError());
            throw new BizException(ErrorCode.WECHAT_CODE_INVALID);
        }
    }

    @Data
    public static class WechatUserInfo {
        private String openid;
        private String unionid;
        private String nickname;
        private String avatarUrl;
    }
}
