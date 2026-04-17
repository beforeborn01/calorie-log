package com.calorielog.module.user.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TokenResponse {
    private String accessToken;
    private String refreshToken;
    private long expiresIn;
    private String tokenType = "Bearer";
    private Long userId;
    private boolean profileComplete;

    public TokenResponse(String accessToken, String refreshToken, long expiresIn, Long userId, boolean profileComplete) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.expiresIn = expiresIn;
        this.tokenType = "Bearer";
        this.userId = userId;
        this.profileComplete = profileComplete;
    }
}
