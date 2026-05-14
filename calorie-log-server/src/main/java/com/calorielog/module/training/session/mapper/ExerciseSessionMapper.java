package com.calorielog.module.training.session.mapper;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.calorielog.module.training.session.entity.ExerciseSession;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface ExerciseSessionMapper extends BaseMapper<ExerciseSession> {

    @Select("SELECT * FROM t_exercise_session WHERE session_id = #{sessionId} ORDER BY sort_order")
    List<ExerciseSession> findBySession(@Param("sessionId") Long sessionId);

    @Delete("DELETE FROM t_exercise_session WHERE session_id = #{sessionId}")
    int deleteBySession(@Param("sessionId") Long sessionId);

    default List<ExerciseSession> findBySessionIds(List<Long> sessionIds) {
        if (sessionIds == null || sessionIds.isEmpty()) return List.of();
        QueryWrapper<ExerciseSession> qw = new QueryWrapper<>();
        qw.in("session_id", sessionIds).orderByAsc("session_id", "sort_order");
        return selectList(qw);
    }
}
