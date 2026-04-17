package com.calorielog.module.social.dto;

import lombok.Data;

@Data
public class RankingEntryResponse {
    private Integer rank;
    private Long userId;
    private String nickname;
    private Integer level;
    private Long score;
    private Boolean isSelf;
}
