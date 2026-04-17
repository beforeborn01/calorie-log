package com.calorielog.module.settings.controller;

import com.calorielog.common.result.Result;
import com.calorielog.common.security.CurrentUser;
import com.calorielog.module.settings.dto.NotificationSettingDto;
import com.calorielog.module.settings.service.NotificationSettingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "设置")
@RestController
@RequestMapping("/api/v1/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final NotificationSettingService notificationService;

    @Operation(summary = "获取通知设置")
    @GetMapping("/notifications")
    public Result<NotificationSettingDto> get() {
        return Result.success(notificationService.get(CurrentUser.requireUserId()));
    }

    @Operation(summary = "保存通知设置")
    @PutMapping("/notifications")
    public Result<NotificationSettingDto> save(@Valid @RequestBody NotificationSettingDto req) {
        return Result.success(notificationService.save(CurrentUser.requireUserId(), req));
    }
}
