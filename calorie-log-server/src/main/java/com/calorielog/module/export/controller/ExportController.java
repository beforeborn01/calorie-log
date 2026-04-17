package com.calorielog.module.export.controller;

import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.common.security.CurrentUser;
import com.calorielog.module.export.service.ExportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

@Tag(name = "导出 (CSV)")
@RestController
@RequestMapping("/api/v1/export")
@RequiredArgsConstructor
public class ExportController {

    private final ExportService exportService;

    @Operation(summary = "导出饮食记录 CSV（UTF-8 BOM，Excel 兼容）")
    @GetMapping(value = "/records", produces = "text/csv")
    public void records(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
                        HttpServletResponse resp) throws IOException {
        String filename = URLEncoder.encode("饮食记录_" + startDate + "_" + endDate + ".csv", StandardCharsets.UTF_8);
        resp.setContentType("text/csv; charset=UTF-8");
        resp.setHeader("Content-Disposition", "attachment; filename*=UTF-8''" + filename);
        try {
            exportService.exportRecords(CurrentUser.requireUserId(), startDate, endDate, resp.getOutputStream());
        } catch (IOException e) {
            throw new BizException(ErrorCode.INTERNAL_ERROR, "导出失败：" + e.getMessage());
        }
    }

    @Operation(summary = "导出排行榜 CSV")
    @GetMapping(value = "/ranking", produces = "text/csv")
    public void ranking(@RequestParam(defaultValue = "exp") String type,
                        @RequestParam(defaultValue = "all") String period,
                        HttpServletResponse resp) throws IOException {
        String filename = URLEncoder.encode("排行榜_" + type + "_" + period + ".csv", StandardCharsets.UTF_8);
        resp.setContentType("text/csv; charset=UTF-8");
        resp.setHeader("Content-Disposition", "attachment; filename*=UTF-8''" + filename);
        exportService.exportRanking(CurrentUser.requireUserId(), type, period, resp.getOutputStream());
    }
}
