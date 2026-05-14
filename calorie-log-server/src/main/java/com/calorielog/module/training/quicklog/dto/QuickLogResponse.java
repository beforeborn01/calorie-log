package com.calorielog.module.training.quicklog.dto;

import com.calorielog.module.training.exercise.dto.ExerciseDTO;
import com.calorielog.module.training.session.dto.WorkoutSessionDTO;
import lombok.Data;

import java.util.List;

@Data
public class QuickLogResponse {
    /** 已创建的训练会话（含动作与组） */
    private WorkoutSessionDTO session;

    /** 本次新建的自定义动作（完整 DTO，便于前端合并到本地动作库） */
    private List<ExerciseDTO> newExercises;

    /** 解析诊断（哪些命中正则，哪些走 LLM，哪些未解析） */
    private List<String> notes;
}
