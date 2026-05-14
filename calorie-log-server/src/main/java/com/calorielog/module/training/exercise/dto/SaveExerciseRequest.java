package com.calorielog.module.training.exercise.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class SaveExerciseRequest {
    /** 可选；由客户端指定以支持离线创建 */
    private Long id;

    @NotBlank
    @Size(max = 100)
    private String name;

    @NotBlank
    private String category;

    private List<String> primaryMuscles;
    private List<String> secondaryMuscles;

    @Min(1) @Max(5)
    private Integer difficulty;

    private String instructions;
    private String tips;
}
