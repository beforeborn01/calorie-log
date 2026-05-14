package com.calorielog.module.training.session.mapper;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.calorielog.module.training.session.entity.CompletedSet;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface CompletedSetMapper extends BaseMapper<CompletedSet> {

    @Select("SELECT * FROM t_completed_set WHERE exercise_session_id = #{exerciseSessionId} ORDER BY set_number")
    List<CompletedSet> findByExerciseSession(@Param("exerciseSessionId") Long exerciseSessionId);

    default List<CompletedSet> findByExerciseSessionIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return List.of();
        QueryWrapper<CompletedSet> qw = new QueryWrapper<>();
        qw.in("exercise_session_id", ids).orderByAsc("exercise_session_id", "set_number");
        return selectList(qw);
    }
}
