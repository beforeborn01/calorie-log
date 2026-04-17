package com.calorielog.module.body.mapper;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.calorielog.module.body.entity.BodyRecord;
import org.apache.ibatis.annotations.Mapper;

import java.time.LocalDate;
import java.util.List;

@Mapper
public interface BodyRecordMapper extends BaseMapper<BodyRecord> {

    default BodyRecord findByDate(Long userId, LocalDate date) {
        return selectOne(new QueryWrapper<BodyRecord>()
                .eq("user_id", userId)
                .eq("record_date", date)
                .last("LIMIT 1"));
    }

    default List<BodyRecord> findInRange(Long userId, LocalDate from, LocalDate to) {
        return selectList(new QueryWrapper<BodyRecord>()
                .eq("user_id", userId)
                .between("record_date", from, to)
                .orderByAsc("record_date"));
    }
}
