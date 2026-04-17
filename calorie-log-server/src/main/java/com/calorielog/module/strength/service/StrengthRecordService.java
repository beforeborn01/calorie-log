package com.calorielog.module.strength.service;

import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.module.goal.service.TrainingScheduleService;
import com.calorielog.module.strength.dto.CreateStrengthRecordRequest;
import com.calorielog.module.strength.dto.StrengthRecordResponse;
import com.calorielog.module.strength.dto.UpdateStrengthRecordRequest;
import com.calorielog.module.strength.entity.Exercise;
import com.calorielog.module.strength.entity.StrengthRecord;
import com.calorielog.module.strength.mapper.StrengthRecordMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StrengthRecordService {

    private final StrengthRecordMapper strengthRecordMapper;
    private final ExerciseService exerciseService;
    private final TrainingScheduleService trainingScheduleService;

    @Transactional
    public StrengthRecordResponse create(Long userId, CreateStrengthRecordRequest req) {
        TrainingScheduleService.DayInfo info = trainingScheduleService.resolve(userId, req.getRecordDate());
        if (!info.trainingDay) throw new BizException(ErrorCode.NOT_TRAINING_DAY);
        Exercise exercise = exerciseService.requireById(req.getExerciseId(), userId);

        StrengthRecord r = new StrengthRecord();
        r.setUserId(userId);
        r.setRecordDate(req.getRecordDate());
        r.setExerciseId(exercise.getId());
        r.setSets(req.getSets());
        r.setRepsPerSet(req.getRepsPerSet());
        r.setWeight(req.getWeight());
        r.setNote(req.getNote());
        strengthRecordMapper.insert(r);
        return toResponse(r, exercise);
    }

    public List<StrengthRecordResponse> listByDate(Long userId, LocalDate date) {
        List<StrengthRecord> records = strengthRecordMapper.findByDate(userId, date);
        return records.stream()
                .map(r -> toResponse(r, exerciseService.requireById(r.getExerciseId(), userId)))
                .collect(Collectors.toList());
    }

    @Transactional
    public StrengthRecordResponse update(Long userId, Long id, UpdateStrengthRecordRequest req) {
        StrengthRecord r = strengthRecordMapper.selectById(id);
        if (r == null) throw new BizException(ErrorCode.RECORD_NOT_FOUND);
        if (!r.getUserId().equals(userId)) throw new BizException(ErrorCode.RECORD_NO_PERMISSION);
        if (req.getSets() != null) r.setSets(req.getSets());
        if (req.getRepsPerSet() != null) r.setRepsPerSet(req.getRepsPerSet());
        if (req.getWeight() != null) r.setWeight(req.getWeight());
        if (req.getNote() != null) r.setNote(req.getNote());
        strengthRecordMapper.updateById(r);
        Exercise exercise = exerciseService.requireById(r.getExerciseId(), userId);
        return toResponse(r, exercise);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        StrengthRecord r = strengthRecordMapper.selectById(id);
        if (r == null) throw new BizException(ErrorCode.RECORD_NOT_FOUND);
        if (!r.getUserId().equals(userId)) throw new BizException(ErrorCode.RECORD_NO_PERMISSION);
        strengthRecordMapper.deleteById(id);
    }

    private StrengthRecordResponse toResponse(StrengthRecord r, Exercise exercise) {
        StrengthRecordResponse resp = new StrengthRecordResponse();
        BeanUtils.copyProperties(r, resp);
        resp.setExerciseName(exercise.getName());
        resp.setBodyPart(exercise.getBodyPart());
        return resp;
    }
}
