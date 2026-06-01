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
 * <p>当前只支持小程序 wx.login → code2Session。网页扫码登录已下线（个人主体小程序不允许 web-view）。</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WechatOAuthService {

    private final WxMaService wxMaService;
    private final WxMaConfig wxMaConfig;

    @Value("${spring.profiles.active:prod}")
    private String profile;

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
