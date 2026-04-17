package com.calorielog.module.record.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.calorielog.module.record.entity.DietRecord;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Mapper
public interface DietRecordMapper extends BaseMapper<DietRecord> {

    @Select("""
        SELECT * FROM t_diet_record
        WHERE user_id = #{userId} AND record_date = #{date} AND deleted_at IS NULL
        ORDER BY meal_type ASC, id ASC
        """)
    List<DietRecord> findByDate(@Param("userId") Long userId, @Param("date") LocalDate date);

    @Select("""
        SELECT
          COALESCE(SUM(calories), 0)       AS total_calories,
          COALESCE(SUM(protein), 0)        AS total_protein,
          COALESCE(SUM(carbohydrate), 0)   AS total_carb,
          COALESCE(SUM(fat), 0)            AS total_fat,
          COALESCE(SUM(dietary_fiber), 0)  AS total_fiber,
          COUNT(DISTINCT COALESCE(food_id, 0)) AS food_variety_count
        FROM t_diet_record
        WHERE user_id = #{userId} AND record_date = #{date} AND deleted_at IS NULL
        """)
    Map<String, Object> aggregateByDate(@Param("userId") Long userId, @Param("date") LocalDate date);

    @Select("""
        SELECT * FROM t_diet_record
        WHERE user_id = #{userId} AND record_date BETWEEN #{from} AND #{to} AND deleted_at IS NULL
        ORDER BY record_date ASC, meal_type ASC, id ASC
        """)
    List<DietRecord> findInRange(@Param("userId") Long userId,
                                 @Param("from") LocalDate from,
                                 @Param("to") LocalDate to);
}
