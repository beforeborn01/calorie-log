package com.calorielog.module.social.dto;

import lombok.Data;

import java.util.List;

@Data
public class RankingResponse {
    private String type;
    private String period;
    private List<RankingEntryResponse> entries;
    private RankingEntryResponse self;
    private Long gapToPrevious;
}
