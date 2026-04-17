package com.calorielog.module.social.controller;

import com.calorielog.common.result.Result;
import com.calorielog.common.security.CurrentUser;
import com.calorielog.module.social.dto.AcceptInviteRequest;
import com.calorielog.module.social.dto.InviteLinkResponse;
import com.calorielog.module.social.dto.InvitePreviewResponse;
import com.calorielog.module.social.service.InviteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "社交 - 邀请")
@RestController
@RequestMapping("/api/v1/social")
@RequiredArgsConstructor
public class InviteController {

    private final InviteService inviteService;

    @Operation(summary = "生成邀请链接（7 天有效）")
    @GetMapping("/invite-link")
    public Result<InviteLinkResponse> create() {
        return Result.success(inviteService.create(CurrentUser.requireUserId()));
    }

    @Operation(summary = "预览邀请信息（登录后使用）")
    @GetMapping("/invite/preview")
    public Result<InvitePreviewResponse> preview(@RequestParam String token) {
        return Result.success(inviteService.preview(token));
    }

    @Operation(summary = "接受邀请自动成为好友")
    @PostMapping("/invite/accept")
    public Result<Long> accept(@Valid @RequestBody AcceptInviteRequest req) {
        return Result.success(inviteService.accept(CurrentUser.requireUserId(), req.getToken()));
    }
}
