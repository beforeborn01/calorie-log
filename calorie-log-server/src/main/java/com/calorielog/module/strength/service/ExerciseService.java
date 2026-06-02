package com.calorielog.module.strength.service;

import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.module.strength.dto.CreateExerciseRequest;
import com.calorielog.module.strength.dto.ExerciseResponse;
import com.calorielog.module.strength.entity.Exercise;
import com.calorielog.module.strength.mapper.ExerciseMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ExerciseService {

    private final ExerciseMapper exerciseMapper;

    public List<ExerciseResponse> list(Long userId, String bodyPart, String keyword) {
        return exerciseMapper.listVisible(userId, bodyPart, keyword).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public ExerciseResponse createCustom(Long userId, CreateExerciseRequest req) {
        Exercise e = new Exercise();
        e.setName(req.getName());
        e.setBodyPart(req.getBodyPart());
        e.setCategory(categoryOf(req.getBodyPart()));
        e.setPrimaryMuscles(req.getBodyPart());
        e.setSecondaryMuscles("");
        e.setDifficulty(1);
        e.setIsPreset(false);
        e.setIsCustom(true);
        e.setIsPopular(false);
        e.setCreatedBy(userId);
        exerciseMapper.insert(e);
        return toResponse(e);
    }

    public Exercise requireById(Long id, Long userId) {
        Exercise e = exerciseMapper.selectById(id);
        if (e == null) throw new BizException(ErrorCode.EXERCISE_NOT_FOUND);
        // 用户自建的只允许本人使用
        if (Boolean.FALSE.equals(e.getIsPreset()) && e.getCreatedBy() != null
                && !e.getCreatedBy().equals(userId)) {
            throw new BizException(ErrorCode.EXERCISE_NOT_FOUND);
        }
        return e;
    }

    /**
     * 批量按 id 拉 Exercise 并按 user 维度过滤可见性。
     * 看不见的动作（他人自建）直接从返回 Map 省略，由调用方决定报错策略。
     */
    public Map<Long, Exercise> batchVisibleByIds(List<Long> ids, Long userId) {
        Map<Long, Exercise> out = new HashMap<>();
        if (ids == null || ids.isEmpty()) return out;
        for (Exercise e : exerciseMapper.selectBatchIds(ids)) {
            boolean ownedByOther = Boolean.FALSE.equals(e.getIsPreset())
                    && e.getCreatedBy() != null
                    && !e.getCreatedBy().equals(userId);
            if (!ownedByOther) out.put(e.getId(), e);
        }
        return out;
    }

    private static String categoryOf(String bodyPart) {
        if (bodyPart == null) return "other";
        return switch (bodyPart) {
            case "胸部" -> "chest";
            case "背部" -> "back";
            case "腿部" -> "legs";
            case "肩部" -> "shoulders";
            case "手臂" -> "arms";
            case "核心" -> "core";
            case "有氧" -> "cardio";
            default -> "other";
        };
    }

    private ExerciseResponse toResponse(Exercise e) {
        ExerciseResponse resp = new ExerciseResponse();
        BeanUtils.copyProperties(e, resp);
        return resp;
    }
}
