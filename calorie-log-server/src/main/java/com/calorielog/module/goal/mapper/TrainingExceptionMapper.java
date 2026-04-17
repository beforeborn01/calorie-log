package com.calorielog.module.goal.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.calorielog.module.goal.entity.TrainingException;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDate;
import java.util.List;

@Mapper
public interface TrainingExceptionMapper extends BaseMapper<TrainingException> {

    @Select("SELECT * FROM t_training_exception WHERE user_id = #{userId} AND exception_date = #{date} LIMIT 1")
    TrainingException findByDate(@Param("userId") Long userId, @Param("date") LocalDate date);

    @Select("""
        SELECT * FROM t_training_exception
        WHERE user_id = #{userId}
          AND exception_date BETWEEN #{from} AND #{to}
        ORDER BY exception_date
        """)
    List<TrainingException> findInRange(@Param("userId") Long userId,
                                        @Param("from") LocalDate from,
                                        @Param("to") LocalDate to);
}
