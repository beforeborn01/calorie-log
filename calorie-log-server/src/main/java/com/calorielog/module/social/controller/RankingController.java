package com.calorielog.module.social.controller;

import com.calorielog.common.result.Result;
import com.calorielog.common.security.CurrentUser;
import com.calorielog.module.social.dto.RankingResponse;
import com.calorielog.module.social.service.RankingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "社交 - 排行榜")
@RestController
@RequestMapping("/api/v1/social")
@RequiredArgsConstructor
public class RankingController {

    private final RankingService rankingService;

    @Operation(summary = "好友排行榜（type=exp|score|streak，period=all|week|month）")
    @GetMapping("/ranking")
    public Result<RankingResponse> query(
            @RequestParam(defaultValue = "exp") String type,
            @RequestParam(defaultValue = "all") String period) {
        return Result.success(rankingService.query(CurrentUser.requireUserId(), type, period));
    }
}
