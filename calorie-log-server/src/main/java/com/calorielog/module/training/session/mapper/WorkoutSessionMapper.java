package com.calorielog.module.training.session.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.calorielog.module.training.session.entity.WorkoutSession;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

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

    /**
     * 周月报告：在 [from, to] 区间内（按 sessionDay 归属）有过完成会话的天数。
     */
    @Select("SELECT COUNT(DISTINCT DATE(COALESCE(end_time, start_time))) "
            + "FROM t_workout_session "
            + "WHERE user_id = #{userId} AND status = 'completed' AND deleted_at IS NULL "
            + "AND DATE(COALESCE(end_time, start_time)) BETWEEN #{from} AND #{to}")
    Integer countTrainingDaysInRange(@Param("userId") Long userId,
                                     @Param("from") LocalDate from,
                                     @Param("to") LocalDate to);

    /**
     * 周月报告：在 [from, to] 区间内（按 sessionDay 归属）的总组数 / 总次数 / 总容量。
     * - 总组数：t_completed_set 里 is_completed=true 的行数
     * - 总次数：那些行的 reps 求和
     * - 总容量：(weight × reps) 求和，weight=0 / null 的不计入容量
     */
    @Select("SELECT "
            + " COUNT(cs.id) AS total_sets, "
            + " COALESCE(SUM(cs.reps), 0) AS total_reps, "
            + " COALESCE(SUM(cs.weight * cs.reps), 0) AS total_volume "
            + "FROM t_workout_session ws "
            + "JOIN t_exercise_session es ON es.session_id = ws.id "
            + "JOIN t_completed_set cs ON cs.exercise_session_id = es.id "
            + "WHERE ws.user_id = #{userId} AND ws.status = 'completed' AND ws.deleted_at IS NULL "
            + "AND cs.is_completed = TRUE "
            + "AND DATE(COALESCE(ws.end_time, ws.start_time)) BETWEEN #{from} AND #{to}")
    Map<String, Object> aggregateVolumeInRange(@Param("userId") Long userId,
                                               @Param("from") LocalDate from,
                                               @Param("to") LocalDate to);
}
