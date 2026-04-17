package com.calorielog.module.social.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SendFriendRequestRequest {
    @NotNull
    private Long toUserId;
    private String message;
}
