package com.calorielog.module.social.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ExpLogResponse {
    private Long id;
    private Integer expChange;
    private String reasonCode;
    private String reasonDetail;
    private LocalDateTime createdAt;
}
