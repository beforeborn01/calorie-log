package com.calorielog.module.training.session.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class SaveSessionRequest {
    /** 可选；客户端指定以支持离线创建 */
    private Long id;
    private Long planId;

    @NotBlank
    @Size(max = 100)
    private String name;

    /** planned / active / paused / completed / aborted */
    private String status;

    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer duration;
    private BigDecimal totalVolume;
    private String notes;
    private String tabId;
    private String source;
    private String rawText;

    @Valid
    private List<ExerciseSessionDTO> exercises;
}
