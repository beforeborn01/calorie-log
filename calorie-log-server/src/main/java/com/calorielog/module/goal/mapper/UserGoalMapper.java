package com.calorielog.module.goal.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.calorielog.module.goal.entity.UserGoal;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface UserGoalMapper extends BaseMapper<UserGoal> {

    @Select("SELECT * FROM t_user_goal WHERE user_id = #{userId} AND is_active = TRUE LIMIT 1")
    UserGoal findActiveByUser(@Param("userId") Long userId);
}
