package com.calorielog.module.goal.mapper;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.calorielog.module.goal.entity.TrainingRule;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface TrainingRuleMapper extends BaseMapper<TrainingRule> {

    default TrainingRule findByUser(Long userId) {
        return selectOne(new QueryWrapper<TrainingRule>().eq("user_id", userId).last("LIMIT 1"));
    }
}
