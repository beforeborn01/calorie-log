package com.calorielog.module.social.dto;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class FriendResponse {
    private Long friendshipId;
    private Long friendUserId;
    private String nickname;
    private String avatarUrl;
    private String remark;
    private Integer level;
    private Long totalExp;
    private Integer continuousDays;
    private LocalDate lastRecordDate;
    private Boolean recordedToday;
    private LocalDateTime createdAt;
}
