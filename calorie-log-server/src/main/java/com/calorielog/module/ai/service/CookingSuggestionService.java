package com.calorielog.module.ai.service;

import com.calorielog.module.ai.dto.CookingSuggestionResponse;

public interface CookingSuggestionService {
    CookingSuggestionResponse suggest(Long userId, String foodName, String preferences);
}
