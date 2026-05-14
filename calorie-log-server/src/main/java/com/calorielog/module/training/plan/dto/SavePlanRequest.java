package com.calorielog.module.training.plan.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class SavePlanRequest {
    /** 可选；由客户端指定以支持离线创建 */
    private Long id;

    @NotBlank
    @Size(max = 100)
    private String name;

    private String description;

    private String type;

    private Integer estimatedDuration;

    private Boolean isTemplate;

    @Valid
    private List<WorkoutExerciseDTO> exercises;
}
