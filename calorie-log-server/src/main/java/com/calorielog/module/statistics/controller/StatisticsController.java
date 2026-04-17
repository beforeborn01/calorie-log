package com.calorielog.module.statistics.controller;

import com.calorielog.common.result.Result;
import com.calorielog.common.security.CurrentUser;
import com.calorielog.module.statistics.dto.DailyStatisticsResponse;
import com.calorielog.module.statistics.dto.DietScoreResponse;
import com.calorielog.module.statistics.dto.DietSuggestionResponse;
import com.calorielog.module.statistics.service.DietScoreService;
import com.calorielog.module.statistics.service.DietSuggestionService;
import com.calorielog.module.statistics.service.StatisticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@Tag(name = "统计")
@RestController
@RequestMapping("/api/v1/statistics")
@RequiredArgsConstructor
public class StatisticsController {

    private final StatisticsService statisticsService;
    private final DietScoreService dietScoreService;
    private final DietSuggestionService dietSuggestionService;

    @Operation(summary = "当日统计（热量 / 目标 / TDEE / 缺口 / 评分）")
    @GetMapping("/daily")
    public Result<DailyStatisticsResponse> daily(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return Result.success(statisticsService.getDaily(CurrentUser.requireUserId(), date));
    }

    @Operation(summary = "当日饮食评分（四维度）")
    @GetMapping("/score")
    public Result<DietScoreResponse> score(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return Result.success(dietScoreService.compute(CurrentUser.requireUserId(), date));
    }

    @Operation(summary = "当日饮食优化建议")
    @GetMapping("/suggestions")
    public Result<DietSuggestionResponse> suggestions(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return Result.success(dietSuggestionService.getSuggestions(CurrentUser.requireUserId(), date));
    }
}
