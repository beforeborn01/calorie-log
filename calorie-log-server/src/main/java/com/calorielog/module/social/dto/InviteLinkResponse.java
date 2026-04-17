package com.calorielog.module.social.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class InviteLinkResponse {
    private String token;
    private String url;
    private LocalDateTime expiresAt;
}
