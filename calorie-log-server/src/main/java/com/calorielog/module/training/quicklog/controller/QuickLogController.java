package com.calorielog.module.training.quicklog.controller;

import com.calorielog.common.result.Result;
import com.calorielog.common.security.CurrentUser;
import com.calorielog.module.training.quicklog.dto.QuickLogRequest;
import com.calorielog.module.training.quicklog.dto.QuickLogResponse;
import com.calorielog.module.training.quicklog.service.QuickLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "训练补录")
@RestController
@RequestMapping("/api/v1/training/sessions")
@RequiredArgsConstructor
public class QuickLogController {

    private final QuickLogService quickLogService;

    @Operation(summary = "从自然语言文本补录训练（解析+落库 一步完成）")
    @PostMapping("/quick-log")
    public Result<QuickLogResponse> quickLog(@Valid @RequestBody QuickLogRequest req) {
        return Result.success(quickLogService.quickLog(CurrentUser.requireUserId(), req));
    }
}
