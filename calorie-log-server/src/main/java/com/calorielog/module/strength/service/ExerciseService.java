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

import java.util.List;
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
        e.setIsPreset(false);
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

    private ExerciseResponse toResponse(Exercise e) {
        ExerciseResponse resp = new ExerciseResponse();
        BeanUtils.copyProperties(e, resp);
        return resp;
    }
}
