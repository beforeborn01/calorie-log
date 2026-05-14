package com.calorielog.module.training.exercise.controller;

import com.calorielog.common.result.Result;
import com.calorielog.common.security.CurrentUser;
import com.calorielog.module.training.exercise.dto.ExerciseDTO;
import com.calorielog.module.training.exercise.dto.SaveExerciseRequest;
import com.calorielog.module.training.exercise.service.ExerciseService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "动作库")
@RestController
@RequestMapping("/api/v1/training/exercises")
@RequiredArgsConstructor
public class ExerciseController {

    private final ExerciseService exerciseService;

    @Operation(summary = "获取全部可见动作（预设 + 自定义）")
    @GetMapping
    public Result<List<ExerciseDTO>> list() {
        return Result.success(exerciseService.list(CurrentUser.requireUserId()));
    }

    @Operation(summary = "搜索动作")
    @GetMapping("/search")
    public Result<List<ExerciseDTO>> search(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "limit", required = false, defaultValue = "100") int limit) {
        return Result.success(exerciseService.search(CurrentUser.requireUserId(), q, category, limit));
    }

    @Operation(summary = "获取单个动作")
    @GetMapping("/{id}")
    public Result<ExerciseDTO> get(@PathVariable Long id) {
        return Result.success(exerciseService.get(CurrentUser.requireUserId(), id));
    }

    @Operation(summary = "创建自定义动作")
    @PostMapping
    public Result<ExerciseDTO> create(@Valid @RequestBody SaveExerciseRequest req) {
        return Result.success(exerciseService.create(CurrentUser.requireUserId(), req));
    }

    @Operation(summary = "更新自定义动作")
    @PutMapping("/{id}")
    public Result<ExerciseDTO> update(@PathVariable Long id, @Valid @RequestBody SaveExerciseRequest req) {
        return Result.success(exerciseService.update(CurrentUser.requireUserId(), id, req));
    }

    @Operation(summary = "删除自定义动作")
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        exerciseService.delete(CurrentUser.requireUserId(), id);
        return Result.success();
    }
}
