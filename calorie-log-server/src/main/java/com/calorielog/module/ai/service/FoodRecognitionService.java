package com.calorielog.module.ai.service;

import com.calorielog.module.ai.dto.RecognizeResponse;

public interface FoodRecognitionService {
    /**
     * 识别图片中的菜品。
     *
     * @param imageBase64 已剥离 dataURI 前缀的 base64 字符串
     * @return 候选列表；已匹配到本地食物库的项目填充 foodId
     */
    RecognizeResponse recognize(Long userId, String imageBase64);
}
