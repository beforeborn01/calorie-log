package com.calorielog.module.training.plan.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.calorielog.module.training.plan.entity.WorkoutPlan;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface WorkoutPlanMapper extends BaseMapper<WorkoutPlan> {

    @Select("SELECT * FROM t_workout_plan WHERE user_id = #{userId} AND deleted_at IS NULL ORDER BY updated_at DESC")
    List<WorkoutPlan> findByUser(@Param("userId") Long userId);
}
