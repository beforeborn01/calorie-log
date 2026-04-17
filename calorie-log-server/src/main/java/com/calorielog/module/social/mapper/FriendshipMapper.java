package com.calorielog.module.social.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.calorielog.module.social.entity.Friendship;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface FriendshipMapper extends BaseMapper<Friendship> {
    @Select("SELECT friend_id FROM t_friendship WHERE user_id = #{userId} AND deleted_at IS NULL")
    List<Long> listFriendIds(@Param("userId") Long userId);
}
