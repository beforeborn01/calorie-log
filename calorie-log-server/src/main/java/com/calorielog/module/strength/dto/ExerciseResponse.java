package com.calorielog.module.strength.dto;

import lombok.Data;

@Data
public class ExerciseResponse {
    private Long id;
    private String name;
    private String bodyPart;
    private Boolean isPreset;
}
