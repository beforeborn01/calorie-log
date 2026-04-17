package com.calorielog.module.strength.controller;

import com.calorielog.common.result.Result;
import com.calorielog.common.security.CurrentUser;
import com.calorielog.module.strength.dto.CreateExerciseRequest;
import com.calorielog.module.strength.dto.CreateStrengthRecordRequest;
import com.calorielog.module.strength.dto.ExerciseResponse;
import com.calorielog.module.strength.dto.StrengthRecordResponse;
import com.calorielog.module.strength.dto.UpdateStrengthRecordRequest;
import com.calorielog.module.strength.service.ExerciseService;
import com.calorielog.module.strength.service.StrengthRecordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@Tag(name = "力量训练")
@RestController
@RequestMapping("/api/v1/strength")
@RequiredArgsConstructor
public class StrengthController {

    private final StrengthRecordService strengthRecordService;
    private final ExerciseService exerciseService;

    @Operation(summary = "动作库（预设 + 自建）")
    @GetMapping("/exercises")
    public Result<List<ExerciseResponse>> listExercises(
            @RequestParam(required = false) String bodyPart,
            @RequestParam(required = false) String keyword) {
        return Result.success(exerciseService.list(CurrentUser.requireUserId(), bodyPart, keyword));
    }

    @Operation(summary = "添加自定义动作")
    @PostMapping("/exercises/custom")
    public Result<ExerciseResponse> createCustomExercise(@Valid @RequestBody CreateExerciseRequest req) {
        return Result.success(exerciseService.createCustom(CurrentUser.requireUserId(), req));
    }

    @Operation(summary = "添加训练记录（训练日才允许）")
    @PostMapping("/records")
    public Result<StrengthRecordResponse> create(@Valid @RequestBody CreateStrengthRecordRequest req) {
        return Result.success(strengthRecordService.create(CurrentUser.requireUserId(), req));
    }

    @Operation(summary = "查询当日训练记录")
    @GetMapping("/records")
    public Result<List<StrengthRecordResponse>> listByDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return Result.success(strengthRecordService.listByDate(CurrentUser.requireUserId(), date));
    }

    @Operation(summary = "更新训练记录")
    @PutMapping("/records/{id}")
    public Result<StrengthRecordResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStrengthRecordRequest req) {
        return Result.success(strengthRecordService.update(CurrentUser.requireUserId(), id, req));
    }

    @Operation(summary = "删除训练记录")
    @DeleteMapping("/records/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        strengthRecordService.delete(CurrentUser.requireUserId(), id);
        return Result.success();
    }
}
