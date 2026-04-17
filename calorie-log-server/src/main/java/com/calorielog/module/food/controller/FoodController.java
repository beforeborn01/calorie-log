package com.calorielog.module.food.controller;

import com.calorielog.common.result.PageResult;
import com.calorielog.common.result.Result;
import com.calorielog.common.security.CurrentUser;
import com.calorielog.module.food.dto.CreateFoodRequest;
import com.calorielog.module.food.dto.FoodResponse;
import com.calorielog.module.food.service.FoodService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "食物")
@RestController
@RequestMapping("/api/v1/foods")
@RequiredArgsConstructor
public class FoodController {

    private final FoodService foodService;

    @Operation(summary = "搜索食物")
    @GetMapping("/search")
    public Result<PageResult<FoodResponse>> search(
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        return Result.success(foodService.search(CurrentUser.requireUserId(), keyword, page, size));
    }

    @Operation(summary = "食物详情")
    @GetMapping("/{id}")
    public Result<FoodResponse> detail(@PathVariable Long id) {
        return Result.success(foodService.getById(CurrentUser.requireUserId(), id));
    }

    @Operation(summary = "添加自定义食物")
    @PostMapping("/custom")
    public Result<FoodResponse> createCustom(@Valid @RequestBody CreateFoodRequest req) {
        return Result.success(foodService.createCustom(CurrentUser.requireUserId(), req));
    }
}
