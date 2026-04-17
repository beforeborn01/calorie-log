package com.calorielog.module.record.controller;

import com.calorielog.common.result.Result;
import com.calorielog.common.security.CurrentUser;
import com.calorielog.module.record.dto.CreateRecordRequest;
import com.calorielog.module.record.dto.DailyRecordsResponse;
import com.calorielog.module.record.dto.DietRecordResponse;
import com.calorielog.module.record.dto.UpdateRecordRequest;
import com.calorielog.module.record.service.DietRecordService;
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

@Tag(name = "饮食记录")
@RestController
@RequestMapping("/api/v1/records")
@RequiredArgsConstructor
public class DietRecordController {

    private final DietRecordService recordService;

    @Operation(summary = "添加饮食记录")
    @PostMapping
    public Result<DietRecordResponse> create(@Valid @RequestBody CreateRecordRequest req) {
        return Result.success(recordService.create(CurrentUser.requireUserId(), req));
    }

    @Operation(summary = "查询当日饮食记录")
    @GetMapping("/daily")
    public Result<DailyRecordsResponse> daily(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return Result.success(recordService.getDaily(CurrentUser.requireUserId(), date));
    }

    @Operation(summary = "编辑饮食记录")
    @PutMapping("/{id}")
    public Result<DietRecordResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRecordRequest req) {
        return Result.success(recordService.update(CurrentUser.requireUserId(), id, req));
    }

    @Operation(summary = "删除饮食记录")
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        recordService.delete(CurrentUser.requireUserId(), id);
        return Result.success();
    }
}
