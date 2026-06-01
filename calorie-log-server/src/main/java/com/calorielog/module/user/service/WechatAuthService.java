package com.calorielog.module.user.service;

import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.common.utils.IdentifierUtils;
import com.calorielog.common.utils.JwtUtils;
import com.calorielog.integration.wechat.WechatOAuthService;
import com.calorielog.module.user.dto.TokenResponse;
import com.calorielog.module.user.dto.WechatBindRequest;
import com.calorielog.module.user.dto.WechatMiniLoginResponse;
import com.calorielog.module.user.entity.User;
import com.calorielog.module.user.entity.UserExperience;
import com.calorielog.module.user.mapper.UserExperienceMapper;
import com.calorielog.module.user.mapper.UserMapper;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class WechatAuthService {

    private final WechatOAuthService wechatOAuthService;
    private final UserMapper userMapper;
    private final UserExperienceMapper userExperienceMapper;
    private final VerifyCodeService verifyCodeService;
    private final AuthService authService;
    private final JwtUtils jwtUtils;
    private final StringRedisTemplate redis;

    private static final String WECHAT_TEMP_PREFIX = "wechat:temp_token:";
    private static final Duration TEMP_TTL = Duration.ofMinutes(10);

    /**
     * 小程序 wx.login 一键登录（软提醒方案）。
     *
     * <p>个人主体小程序拿不到手机号，所以未注册用户直接创建一个无 phone 的 User；
     * 已注册（按 openid 匹配）则正常发 token。前端按 needBindPhone 软提醒用户去绑手机号。</p>
     *
     * <p>账号合并：若同一微信号之前在网页扫码登录中绑过手机号 → 此处会按 openid 命中
     * 同一条 User 记录，token 可直接发；不会出现"两套账号"。</p>
     */
    @Transactional
    public WechatMiniLoginResponse loginByMiniprogramCode(String code) {
        WechatOAuthService.WechatUserInfo wx = wechatOAuthService.miniprogramCode2Session(code);
        User user = userMapper.findByWechatOpenid(wx.getOpenid());

        if (user == null) {
            user = new User();
            user.setWechatOpenid(wx.getOpenid());
            user.setWechatUnionid(wx.getUnionid());
            user.setStatus(1);
            user.setGender(0);
            user.setTimezone("Asia/Shanghai");
            // 个人小程序没手机号；用 openid 后 4 位作昵称兜底
            String tail = wx.getOpenid().length() > 4
                    ? wx.getOpenid().substring(wx.getOpenid().length() - 4)
                    : wx.getOpenid();
            user.setNickname("微信用户" + tail);
            userMapper.insert(user);

            UserExperience exp = new UserExperience();
            exp.setUserId(user.getId());
            exp.setTotalExp(0L);
            exp.setLevel(1);
            exp.setContinuousDays(0);
            userExperienceMapper.insert(exp);
        } else if (user.getWechatUnionid() == null && wx.getUnionid() != null) {
            // 老用户首次回填 unionid（开放平台后绑时常见）
            user.setWechatUnionid(wx.getUnionid());
            userMapper.updateById(user);
        }

        TokenResponse token = authService.issueTokens(user, authService.isProfileComplete(user));
        boolean needBindPhone = user.getPhone() == null || user.getPhone().isBlank();
        return new WechatMiniLoginResponse(token, needBindPhone);
    }

    @Transactional
    public TokenResponse bindPhone(WechatBindRequest req) {
        Claims claims;
        try {
            claims = jwtUtils.parse(req.getTempToken());
        } catch (Exception e) {
            throw new BizException(ErrorCode.WECHAT_TEMP_TOKEN_INVALID);
        }
        String type = claims.get("type", String.class);
        if (!"WECHAT_TEMP".equals(type)) {
            throw new BizException(ErrorCode.WECHAT_TEMP_TOKEN_INVALID);
        }
        String openid = redis.opsForValue().get(WECHAT_TEMP_PREFIX + req.getTempToken());
        if (openid == null) {
            throw new BizException(ErrorCode.WECHAT_TEMP_TOKEN_INVALID);
        }

        IdentifierUtils.IdentifierType idType = IdentifierUtils.detect(req.getPhone());
        if (idType != IdentifierUtils.IdentifierType.PHONE) {
            throw new BizException(ErrorCode.IDENTIFIER_FORMAT_INVALID);
        }
        verifyCodeService.verify(req.getPhone(), "wechat_bind", req.getVerifyCode());

        User existing = userMapper.findByPhone(req.getPhone());
        User finalUser;
        if (existing != null) {
            if (existing.getWechatOpenid() != null && !existing.getWechatOpenid().equals(openid)) {
                throw new BizException(ErrorCode.CONFLICT, "该手机号已绑定其他微信");
            }
            existing.setWechatOpenid(openid);
            userMapper.updateById(existing);
            finalUser = existing;
        } else {
            User user = new User();
            user.setPhone(req.getPhone());
            user.setWechatOpenid(openid);
            user.setStatus(1);
            user.setGender(0);
            user.setTimezone("Asia/Shanghai");
            user.setNickname("微信用户" + req.getPhone().substring(req.getPhone().length() - 4));
            userMapper.insert(user);
            // init experience
            UserExperience exp = new UserExperience();
            exp.setUserId(user.getId());
            exp.setTotalExp(0L);
            exp.setLevel(1);
            exp.setContinuousDays(0);
            userExperienceMapper.insert(exp);
            finalUser = user;
        }
        redis.delete(WECHAT_TEMP_PREFIX + req.getTempToken());
        return authService.issueTokens(finalUser, authService.isProfileComplete(finalUser));
    }
}
