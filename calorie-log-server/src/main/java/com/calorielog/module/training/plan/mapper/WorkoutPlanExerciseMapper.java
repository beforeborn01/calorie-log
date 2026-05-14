package com.calorielog.module.training.plan.mapper;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.calorielog.module.training.plan.entity.WorkoutPlanExercise;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface WorkoutPlanExerciseMapper extends BaseMapper<WorkoutPlanExercise> {

    @Select("SELECT * FROM t_workout_plan_exercise WHERE plan_id = #{planId} ORDER BY sort_order")
    List<WorkoutPlanExercise> findByPlan(@Param("planId") Long planId);

    @Delete("DELETE FROM t_workout_plan_exercise WHERE plan_id = #{planId}")
    int deleteByPlan(@Param("planId") Long planId);

    default List<WorkoutPlanExercise> findByPlanIds(List<Long> planIds) {
        if (planIds == null || planIds.isEmpty()) return List.of();
        QueryWrapper<WorkoutPlanExercise> qw = new QueryWrapper<>();
        qw.in("plan_id", planIds).orderByAsc("plan_id", "sort_order");
        return selectList(qw);
    }
}
