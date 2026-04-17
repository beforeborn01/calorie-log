package com.calorielog.module.strength.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateExerciseRequest {
    @NotBlank @Size(max = 100)
    private String name;

    @NotBlank @Size(max = 50)
    private String bodyPart;
}
