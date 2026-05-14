package com.calorielog.module.training.session.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class FinishSessionRequest {
    private LocalDateTime endTime;
    private Integer duration;
    private String notes;
}
