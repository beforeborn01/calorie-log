package com.calorielog.module.goal.controller;

import com.calorielog.common.result.Result;
import com.calorielog.common.security.CurrentUser;
import com.calorielog.module.goal.dto.GoalResponse;
import com.calorielog.module.goal.dto.MealDistributionResponse;
import com.calorielog.module.goal.dto.SetGoalRequest;
import com.calorielog.module.goal.dto.TrainingScheduleRequest;
import com.calorielog.module.goal.dto.TrainingScheduleResponse;
import com.calorielog.module.goal.service.GoalService;
import com.calorielog.module.goal.service.MealDistributionService;
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
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.time.YearMonth;

@Tag(name = "健身目标")
@RestController
@RequestMapping("/api/v1/goals")
@RequiredArgsConstructor
public class GoalController {

    private final GoalService goalService;
    private final MealDistributionService mealDistributionService;

    @Operation(summary = "设置 / 切换健身目标")
    @PostMapping
    public Result<GoalResponse> setGoal(@Valid @RequestBody SetGoalRequest req) {
        return Result.success(goalService.setGoal(CurrentUser.requireUserId(), req));
    }

    @Operation(summary = "查询当前健身目标")
    @GetMapping("/current")
    public Result<GoalResponse> getCurrent() {
        return Result.success(goalService.getCurrent(CurrentUser.requireUserId()));
    }

    @Operation(summary = "保存训练日/休息日计划")
    @PostMapping("/training-schedule")
    public Result<Void> saveTrainingSchedule(@Valid @RequestBody TrainingScheduleRequest req) {
        goalService.saveTrainingSchedule(CurrentUser.requireUserId(), req);
        return Result.success();
    }

    @Operation(summary = "查询某月训练日计划")
    @GetMapping("/training-schedule")
    public Result<TrainingScheduleResponse> getTrainingSchedule(
            @RequestParam(value = "month", required = false) String month) {
        YearMonth ym = (month == null || month.isBlank()) ? YearMonth.now() : YearMonth.parse(month);
        return Result.success(goalService.getTrainingSchedule(CurrentUser.requireUserId(), ym));
    }

    @Operation(summary = "每餐热量分配建议")
    @GetMapping("/meal-distribution")
    public Result<MealDistributionResponse> mealDistribution(
            @RequestParam(value = "date", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate d = date == null ? LocalDate.now() : date;
        return Result.success(mealDistributionService.get(CurrentUser.requireUserId(), d));
    }
}
