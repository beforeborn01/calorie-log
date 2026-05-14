package com.calorielog.module.training.plan.controller;

import com.calorielog.common.result.Result;
import com.calorielog.common.security.CurrentUser;
import com.calorielog.module.training.plan.dto.SavePlanRequest;
import com.calorielog.module.training.plan.dto.WorkoutPlanDTO;
import com.calorielog.module.training.plan.service.WorkoutPlanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "训练计划")
@RestController
@RequestMapping("/api/v1/training/plans")
@RequiredArgsConstructor
public class WorkoutPlanController {

    private final WorkoutPlanService planService;

    @Operation(summary = "获取全部计划")
    @GetMapping
    public Result<List<WorkoutPlanDTO>> list() {
        return Result.success(planService.list(CurrentUser.requireUserId()));
    }

    @Operation(summary = "获取单个计划")
    @GetMapping("/{id}")
    public Result<WorkoutPlanDTO> get(@PathVariable Long id) {
        return Result.success(planService.get(CurrentUser.requireUserId(), id));
    }

    @Operation(summary = "创建计划")
    @PostMapping
    public Result<WorkoutPlanDTO> create(@Valid @RequestBody SavePlanRequest req) {
        return Result.success(planService.create(CurrentUser.requireUserId(), req));
    }

    @Operation(summary = "更新计划")
    @PutMapping("/{id}")
    public Result<WorkoutPlanDTO> update(@PathVariable Long id, @Valid @RequestBody SavePlanRequest req) {
        return Result.success(planService.update(CurrentUser.requireUserId(), id, req));
    }

    @Operation(summary = "删除计划")
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        planService.delete(CurrentUser.requireUserId(), id);
        return Result.success();
    }
}
