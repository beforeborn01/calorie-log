package com.calorielog.module.training.stats.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.calorielog.module.training.stats.entity.PersonalRecord;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface PersonalRecordMapper extends BaseMapper<PersonalRecord> {

    @Select("SELECT * FROM t_personal_record WHERE user_id = #{userId}")
    List<PersonalRecord> findByUser(@Param("userId") Long userId);

    @Select("SELECT * FROM t_personal_record WHERE user_id = #{userId} AND exercise_id = #{exerciseId} LIMIT 1")
    PersonalRecord findByUserAndExercise(@Param("userId") Long userId, @Param("exerciseId") Long exerciseId);
}
