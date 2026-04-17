package com.calorielog.module.social.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class HandleFriendRequestRequest {
    /** accept / reject */
    @NotNull
    private String action;
}
