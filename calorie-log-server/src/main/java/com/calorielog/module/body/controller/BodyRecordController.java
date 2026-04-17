package com.calorielog.module.body.controller;

import com.calorielog.common.result.Result;
import com.calorielog.common.security.CurrentUser;
import com.calorielog.module.body.dto.BodyRecordResponse;
import com.calorielog.module.body.dto.BodyTrendResponse;
import com.calorielog.module.body.dto.SaveBodyRecordRequest;
import com.calorielog.module.body.service.BodyRecordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@Tag(name = "体重体脂")
@RestController
@RequestMapping("/api/v1/body")
@RequiredArgsConstructor
public class BodyRecordController {

    private final BodyRecordService bodyRecordService;

    @Operation(summary = "记录/更新体重体脂（按 recordDate upsert）")
    @PostMapping("/records")
    public Result<BodyRecordResponse> save(@Valid @RequestBody SaveBodyRecordRequest req) {
        return Result.success(bodyRecordService.save(CurrentUser.requireUserId(), req));
    }

    @Operation(summary = "查询历史趋势")
    @GetMapping("/records")
    public Result<BodyTrendResponse> trend(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return Result.success(bodyRecordService.getTrend(CurrentUser.requireUserId(), startDate, endDate));
    }

    @Operation(summary = "删除体重体脂记录")
    @DeleteMapping("/records/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        bodyRecordService.delete(CurrentUser.requireUserId(), id);
        return Result.success();
    }
}
