package com.calorielog.module.social.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AcceptInviteRequest {
    @NotBlank
    private String token;
}
