package com.calorielog.module.user.controller;

import com.calorielog.common.result.Result;
import com.calorielog.module.user.dto.LoginRequest;
import com.calorielog.module.user.dto.RefreshRequest;
import com.calorielog.module.user.dto.RegisterRequest;
import com.calorielog.module.user.dto.ResetPasswordRequest;
import com.calorielog.module.user.dto.SendCodeRequest;
import com.calorielog.module.user.dto.TokenResponse;
import com.calorielog.module.user.dto.WechatBindRequest;
import com.calorielog.module.user.dto.WechatLoginRequest;
import com.calorielog.module.user.dto.WechatLoginResponse;
import com.calorielog.module.user.dto.WechatPollResponse;
import com.calorielog.module.user.dto.WechatQrCodeResponse;
import com.calorielog.module.user.service.AuthService;
import com.calorielog.module.user.service.VerifyCodeService;
import com.calorielog.module.user.service.WechatAuthService;
import com.calorielog.module.user.service.WechatQrLoginService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@Tag(name = "认证")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final VerifyCodeService verifyCodeService;
    private final WechatAuthService wechatAuthService;
    private final WechatQrLoginService wechatQrLoginService;

    @Operation(summary = "发送验证码")
    @PostMapping("/send-code")
    public Result<Map<String, Object>> sendCode(@Valid @RequestBody SendCodeRequest req) {
        String code = verifyCodeService.sendCode(req.getIdentifier(), req.getScene());
        Map<String, Object> data = new HashMap<>();
        if (code != null) data.put("code", code);  // dev mock mode only
        data.put("sent", true);
        return Result.success(data);
    }

    @Operation(summary = "注册")
    @PostMapping("/register")
    public Result<TokenResponse> register(@Valid @RequestBody RegisterRequest req) {
        return Result.success(authService.register(req));
    }

    @Operation(summary = "登录")
    @PostMapping("/login")
    public Result<TokenResponse> login(@Valid @RequestBody LoginRequest req) {
        return Result.success(authService.login(req));
    }

    @Operation(summary = "刷新 Token")
    @PostMapping("/refresh")
    public Result<TokenResponse> refresh(@Valid @RequestBody RefreshRequest req) {
        return Result.success(authService.refresh(req));
    }

    @Operation(summary = "登出")
    @PostMapping("/logout")
    public Result<Void> logout(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            authService.logout(header.substring(7).trim());
        }
        return Result.success();
    }

    @Operation(summary = "微信登录")
    @PostMapping("/wechat")
    public Result<WechatLoginResponse> wechat(@Valid @RequestBody WechatLoginRequest req) {
        return Result.success(wechatAuthService.loginByCode(req.getCode()));
    }

    @Operation(summary = "微信绑定手机号")
    @PostMapping("/wechat/bind")
    public Result<TokenResponse> wechatBind(@Valid @RequestBody WechatBindRequest req) {
        return Result.success(wechatAuthService.bindPhone(req));
    }

    @Operation(summary = "忘记密码：凭验证码重置")
    @PostMapping("/reset-password")
    public Result<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        authService.resetPassword(req.getIdentifier(), req.getVerifyCode(), req.getNewPassword());
        return Result.success();
    }

    @Operation(summary = "网页扫码登录：申请 ticket + 二维码")
    @GetMapping("/wechat/qrcode")
    public Result<WechatQrCodeResponse> wechatQrCode() {
        return Result.success(wechatQrLoginService.createTicket());
    }

    @Operation(summary = "网页扫码登录：轮询状态")
    @GetMapping("/wechat/poll")
    public Result<WechatPollResponse> wechatPoll(@RequestParam String ticket) {
        return Result.success(wechatQrLoginService.poll(ticket));
    }

    @Operation(summary = "仅 dev：模拟扫码确认", description = "targetUserId 可省略（默认绑定第一个启用账号）")
    @PostMapping("/wechat/mock-confirm")
    public Result<Void> wechatMockConfirm(@RequestParam String ticket,
                                          @RequestParam(required = false) Long targetUserId) {
        wechatQrLoginService.mockConfirm(ticket, targetUserId);
        return Result.success();
    }
}
