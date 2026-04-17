package com.calorielog.module.ai.controller;

import com.calorielog.common.result.Result;
import com.calorielog.common.security.CurrentUser;
import com.calorielog.module.ai.dto.CookingFavoriteResponse;
import com.calorielog.module.ai.dto.SaveCookingFavoriteRequest;
import com.calorielog.module.ai.service.CookingFavoriteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "AI - 烹饪收藏")
@RestController
@RequestMapping("/api/v1/cooking-favorites")
@RequiredArgsConstructor
public class CookingFavoriteController {

    private final CookingFavoriteService service;

    @Operation(summary = "收藏烹饪方法")
    @PostMapping
    public Result<CookingFavoriteResponse> add(@Valid @RequestBody SaveCookingFavoriteRequest req) {
        return Result.success(service.add(CurrentUser.requireUserId(), req));
    }

    @Operation(summary = "我的收藏列表")
    @GetMapping
    public Result<List<CookingFavoriteResponse>> list() {
        return Result.success(service.list(CurrentUser.requireUserId()));
    }

    @Operation(summary = "取消收藏")
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        service.delete(CurrentUser.requireUserId(), id);
        return Result.success();
    }
}
