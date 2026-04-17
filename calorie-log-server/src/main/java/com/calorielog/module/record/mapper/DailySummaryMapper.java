package com.calorielog.module.record.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.calorielog.module.record.entity.DailySummary;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDate;
import java.util.List;

@Mapper
public interface DailySummaryMapper extends BaseMapper<DailySummary> {

    @Select("SELECT * FROM t_daily_summary WHERE user_id = #{userId} AND summary_date = #{date} LIMIT 1")
    DailySummary findByDate(@Param("userId") Long userId, @Param("date") LocalDate date);

    @Select("SELECT * FROM t_daily_summary WHERE user_id = #{userId} "
            + "AND summary_date BETWEEN #{from} AND #{to} ORDER BY summary_date ASC")
    List<DailySummary> findInRange(@Param("userId") Long userId,
                                   @Param("from") LocalDate from,
                                   @Param("to") LocalDate to);
}
