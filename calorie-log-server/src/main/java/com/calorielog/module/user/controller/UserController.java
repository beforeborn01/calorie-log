package com.calorielog.module.user.controller;

import com.calorielog.common.result.Result;
import com.calorielog.common.security.CurrentUser;
import com.calorielog.module.user.dto.ChangePasswordRequest;
import com.calorielog.module.user.dto.UpdateProfileRequest;
import com.calorielog.module.user.dto.UserProfileResponse;
import com.calorielog.module.user.service.AuthService;
import com.calorielog.module.user.service.UserService;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import java.util.concurrent.TimeUnit;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "用户")
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final AuthService authService;

    @Operation(summary = "获取个人信息")
    @GetMapping("/profile")
    public Result<UserProfileResponse> getProfile() {
        return Result.success(userService.getProfile(CurrentUser.requireUserId()));
    }

    @Operation(summary = "完善/修改个人信息")
    @PutMapping("/profile")
    public Result<UserProfileResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest req) {
        return Result.success(userService.updateProfile(CurrentUser.requireUserId(), req));
    }

    @Operation(summary = "上传/更新头像")
    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Result<UserProfileResponse> uploadAvatar(@RequestParam("file") MultipartFile file) {
        return Result.success(userService.updateAvatar(CurrentUser.requireUserId(), file));
    }

    @Operation(summary = "读取头像文件")
    @GetMapping("/avatar/{filename:.+}")
    public ResponseEntity<Resource> getAvatar(@PathVariable String filename) {
        Resource resource = userService.loadAvatar(filename);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(userService.avatarContentType(filename)))
                .cacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic())
                .body(resource);
    }

    @Operation(summary = "修改密码（需原密码，成功后所有 Token 失效）")
    @PutMapping("/password")
    public Result<Void> changePassword(@Valid @RequestBody ChangePasswordRequest req) {
        authService.changePassword(CurrentUser.requireUserId(), req.getOldPassword(), req.getNewPassword());
        return Result.success();
    }
}
