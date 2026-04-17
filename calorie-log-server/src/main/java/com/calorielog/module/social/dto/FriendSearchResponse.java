package com.calorielog.module.social.dto;

import lombok.Data;

@Data
public class FriendSearchResponse {
    private Long userId;
    private String nickname;
    private String avatarUrl;
    private String maskedPhone;
    private Integer level;
    /** already_friend / request_pending / not_friend / self */
    private String relation;
}
