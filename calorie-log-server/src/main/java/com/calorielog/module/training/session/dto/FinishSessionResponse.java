package com.calorielog.module.training.session.dto;

import com.calorielog.module.training.stats.dto.UserStatsResponse;
import lombok.Data;

import java.util.Map;

@Data
public class FinishSessionResponse {
    private WorkoutSessionDTO session;
    private Map<Long, UserStatsResponse.PRValue> newPersonalRecords;
}
