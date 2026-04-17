package com.calorielog.module.goal.dto;

import com.calorielog.module.goal.entity.UserGoal;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class GoalResponse {
    private Long id;
    private Integer goalType;
    private String goalTypeLabel;
    private BigDecimal bmr;
    private BigDecimal tdeeBase;
    private BigDecimal targetCaloriesTraining;
    private BigDecimal targetCaloriesRest;
    private BigDecimal proteinRatio;
    private BigDecimal carbRatio;
    private BigDecimal fatRatio;
    private LocalDateTime startedAt;

    public static GoalResponse of(UserGoal g) {
        GoalResponse r = new GoalResponse();
        r.setId(g.getId());
        r.setGoalType(g.getGoalType());
        r.setGoalTypeLabel(g.getGoalType() == 1 ? "增肌塑型" : "减脂增肌");
        r.setBmr(g.getBmr());
        r.setTdeeBase(g.getTdeeBase());
        r.setTargetCaloriesTraining(g.getTargetCaloriesTraining());
        r.setTargetCaloriesRest(g.getTargetCaloriesRest());
        r.setProteinRatio(g.getProteinRatio());
        r.setCarbRatio(g.getCarbRatio());
        r.setFatRatio(g.getFatRatio());
        r.setStartedAt(g.getStartedAt());
        return r;
    }
}
