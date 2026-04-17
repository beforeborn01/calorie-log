package com.calorielog.module.social.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class FriendRequestResponse {
    private Long id;
    private Long fromUserId;
    private Long toUserId;
    private String fromNickname;
    private String toNickname;
    private String message;
    private Integer status;
    private LocalDateTime createdAt;
    private LocalDateTime handledAt;
    /** incoming / outgoing */
    private String direction;
}
