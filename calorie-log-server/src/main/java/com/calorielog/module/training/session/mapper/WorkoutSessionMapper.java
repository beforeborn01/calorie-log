package com.calorielog.module.training.session.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.calorielog.module.training.session.entity.WorkoutSession;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDate;
import java.util.List;

@Mapper
public interface WorkoutSessionMapper extends BaseMapper<WorkoutSession> {

    @Select("SELECT * FROM t_workout_session WHERE user_id = #{userId} AND deleted_at IS NULL ORDER BY start_time DESC LIMIT #{limit} OFFSET #{offset}")
    List<WorkoutSession> findByUser(@Param("userId") Long userId,
                                    @Param("limit") int limit,
                                    @Param("offset") int offset);

    @Select("SELECT * FROM t_workout_session WHERE user_id = #{userId} AND status = 'in_progress' AND deleted_at IS NULL ORDER BY start_time DESC LIMIT 1")
    WorkoutSession findActive(@Param("userId") Long userId);

    /**
     * 按归属日查询：end_time 优先，缺失退到 start_time。和 WorkoutSessionService.sessionDay 一致。
     */
    @Select("SELECT * FROM t_workout_session WHERE user_id = #{userId} AND deleted_at IS NULL "
            + "AND DATE(COALESCE(end_time, start_time)) = #{day} "
            + "ORDER BY COALESCE(end_time, start_time) DESC")
    List<WorkoutSession> findByUserAndDay(@Param("userId") Long userId,
                                          @Param("day") LocalDate day);
}
