package com.calorielog.module.strength.mapper;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.calorielog.module.strength.entity.Exercise;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface ExerciseMapper extends BaseMapper<Exercise> {

    /** 返回预设 + 当前用户自建 */
    default List<Exercise> listVisible(Long userId, String bodyPart, String keyword) {
        QueryWrapper<Exercise> qw = new QueryWrapper<>();
        qw.and(w -> w.eq("is_preset", true).or().eq("created_by", userId));
        if (bodyPart != null && !bodyPart.isBlank()) qw.eq("body_part", bodyPart);
        if (keyword != null && !keyword.isBlank()) qw.like("name", keyword);
        qw.orderByAsc("is_preset").orderByAsc("id");
        return selectList(qw);
    }
}
