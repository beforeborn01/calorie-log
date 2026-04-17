package com.calorielog.module.strength.mapper;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.calorielog.module.strength.entity.StrengthRecord;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Mapper
public interface StrengthRecordMapper extends BaseMapper<StrengthRecord> {

    default List<StrengthRecord> findByDate(Long userId, LocalDate date) {
        return selectList(new QueryWrapper<StrengthRecord>()
                .eq("user_id", userId)
                .eq("record_date", date)
                .orderByAsc("id"));
    }

    default List<StrengthRecord> findInRange(Long userId, LocalDate from, LocalDate to) {
        return selectList(new QueryWrapper<StrengthRecord>()
                .eq("user_id", userId)
                .between("record_date", from, to)
                .orderByAsc("record_date"));
    }

    @Select("SELECT COUNT(DISTINCT record_date) FROM t_strength_record "
            + "WHERE user_id = #{userId} AND record_date BETWEEN #{from} AND #{to} AND deleted_at IS NULL")
    int countTrainingDays(@Param("userId") Long userId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Select("SELECT COUNT(*) AS total_sets, COALESCE(SUM(reps_per_set * sets), 0) AS total_reps, "
            + "COALESCE(SUM(weight * reps_per_set * sets), 0) AS total_volume "
            + "FROM t_strength_record "
            + "WHERE user_id = #{userId} AND record_date BETWEEN #{from} AND #{to} AND deleted_at IS NULL")
    Map<String, Object> aggregateVolume(@Param("userId") Long userId, @Param("from") LocalDate from, @Param("to") LocalDate to);
}
