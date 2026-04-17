package com.calorielog.module.ai.controller;

import com.calorielog.common.result.Result;
import com.calorielog.common.security.CurrentUser;
import com.calorielog.module.ai.dto.CookingSuggestionRequest;
import com.calorielog.module.ai.dto.CookingSuggestionResponse;
import com.calorielog.module.ai.dto.RecognizeRequest;
import com.calorielog.module.ai.dto.RecognizeResponse;
import com.calorielog.module.ai.service.CookingSuggestionService;
import com.calorielog.module.ai.service.FoodRecognitionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "AI - 食物识别 / 烹饪建议")
@RestController
@RequestMapping("/api/v1/foods")
@RequiredArgsConstructor
public class AiController {

    private final FoodRecognitionService recognitionService;
    private final CookingSuggestionService cookingSuggestionService;

    @Operation(summary = "拍照识别食物", description = "上传 base64 图片，返回候选菜品并尝试匹配本地食物库")
    @PostMapping("/recognize")
    public Result<RecognizeResponse> recognize(@Valid @RequestBody RecognizeRequest req) {
        return Result.success(recognitionService.recognize(CurrentUser.requireUserId(), req.getImageBase64()));
    }

    @Operation(summary = "烹饪方法推荐", description = "基于食材 + 当前健身目标 + 偏好返回 1~3 种烹饪方法")
    @PostMapping("/cooking-suggestions")
    public Result<CookingSuggestionResponse> cooking(@Valid @RequestBody CookingSuggestionRequest req) {
        return Result.success(cookingSuggestionService.suggest(
                CurrentUser.requireUserId(), req.getFoodName(), req.getPreferences()));
    }
}
