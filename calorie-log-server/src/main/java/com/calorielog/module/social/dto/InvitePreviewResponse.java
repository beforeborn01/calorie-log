package com.calorielog.module.social.dto;

import lombok.Data;

@Data
public class InvitePreviewResponse {
    private Long inviterUserId;
    private String inviterNickname;
    private Integer inviterLevel;
    private Boolean valid;
}
