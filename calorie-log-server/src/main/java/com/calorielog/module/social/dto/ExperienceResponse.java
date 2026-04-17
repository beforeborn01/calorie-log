package com.calorielog.module.social.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class ExperienceResponse {
    private Long userId;
    private Long totalExp;
    private Integer level;
    private Integer continuousDays;
    private LocalDate lastRecordDate;
    private Long expToNextLevel;
    private Long currentLevelExp;
    private Long nextLevelExp;
    private BigDecimal levelProgress;
}
