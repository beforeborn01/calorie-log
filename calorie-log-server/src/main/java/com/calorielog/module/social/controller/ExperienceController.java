package com.calorielog.module.social.controller;

import com.calorielog.common.result.Result;
import com.calorielog.common.security.CurrentUser;
import com.calorielog.module.social.dto.ExpLogResponse;
import com.calorielog.module.social.dto.ExperienceResponse;
import com.calorielog.module.social.service.ExperienceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "社交 - 经验值")
@RestController
@RequestMapping("/api/v1/social")
@RequiredArgsConstructor
public class ExperienceController {

    private final ExperienceService experienceService;

    @Operation(summary = "当前用户经验值/等级")
    @GetMapping("/experience")
    public Result<ExperienceResponse> getSelf() {
        return Result.success(experienceService.getOrInit(CurrentUser.requireUserId()));
    }

    @Operation(summary = "经验值流水（最近 N 条）")
    @GetMapping("/experience/logs")
    public Result<List<ExpLogResponse>> logs(@RequestParam(defaultValue = "30") int limit) {
        return Result.success(experienceService.recentLogs(CurrentUser.requireUserId(), limit));
    }
}
