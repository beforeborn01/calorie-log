package com.calorielog.module.training.session.controller;

import com.calorielog.common.result.Result;
import com.calorielog.common.security.CurrentUser;
import com.calorielog.module.training.session.dto.FinishSessionRequest;
import com.calorielog.module.training.session.dto.FinishSessionResponse;
import com.calorielog.module.training.session.dto.SaveSessionRequest;
import com.calorielog.module.training.session.dto.WorkoutSessionDTO;
import com.calorielog.module.training.session.service.WorkoutSessionService;
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

@Tag(name = "训练会话")
@RestController
@RequestMapping("/api/v1/training/sessions")
@RequiredArgsConstructor
public class WorkoutSessionController {

    private final WorkoutSessionService sessionService;

    @Operation(summary = "分页获取历史")
    @GetMapping
    public Result<List<WorkoutSessionDTO>> list(
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        return Result.success(sessionService.list(CurrentUser.requireUserId(), page, size));
    }

    @Operation(summary = "获取当前活跃会话（active/paused，最多一条）")
    @GetMapping("/active")
    public Result<WorkoutSessionDTO> getActive() {
        return Result.success(sessionService.getActive(CurrentUser.requireUserId()));
    }

    @Operation(summary = "获取单个会话")
    @GetMapping("/{id}")
    public Result<WorkoutSessionDTO> get(@PathVariable Long id) {
        return Result.success(sessionService.get(CurrentUser.requireUserId(), id));
    }

    @Operation(summary = "创建/开始训练")
    @PostMapping
    public Result<WorkoutSessionDTO> create(@Valid @RequestBody SaveSessionRequest req) {
        return Result.success(sessionService.create(CurrentUser.requireUserId(), req));
    }

    @Operation(summary = "更新会话（训练过程中）")
    @PutMapping("/{id}")
    public Result<WorkoutSessionDTO> update(@PathVariable Long id, @Valid @RequestBody SaveSessionRequest req) {
        return Result.success(sessionService.update(CurrentUser.requireUserId(), id, req));
    }

    @Operation(summary = "结束训练，返回新 PR")
    @PostMapping("/{id}/finish")
    public Result<FinishSessionResponse> finish(@PathVariable Long id,
                                                @RequestBody(required = false) FinishSessionRequest req) {
        return Result.success(sessionService.finish(CurrentUser.requireUserId(), id,
                req != null ? req : new FinishSessionRequest()));
    }

    @Operation(summary = "放弃训练")
    @PostMapping("/{id}/abort")
    public Result<WorkoutSessionDTO> abort(@PathVariable Long id) {
        return Result.success(sessionService.abort(CurrentUser.requireUserId(), id));
    }

    @Operation(summary = "删除记录")
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        sessionService.delete(CurrentUser.requireUserId(), id);
        return Result.success();
    }
}
