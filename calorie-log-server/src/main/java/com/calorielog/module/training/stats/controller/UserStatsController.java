package com.calorielog.module.training.stats.controller;

import com.calorielog.common.result.Result;
import com.calorielog.common.security.CurrentUser;
import com.calorielog.module.training.stats.dto.UserStatsResponse;
import com.calorielog.module.training.stats.service.UserStatsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "统计")
@RestController
@RequestMapping("/api/v1/training/stats")
@RequiredArgsConstructor
public class UserStatsController {

    private final UserStatsService userStatsService;

    @Operation(summary = "获取当前用户统计")
    @GetMapping
    public Result<UserStatsResponse> get() {
        return Result.success(userStatsService.getStats(CurrentUser.requireUserId()));
    }
}
