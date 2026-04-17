package com.calorielog.module.social.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.calorielog.module.social.entity.Friendship;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

@Mapper
public interface FriendshipMapper extends BaseMapper<Friendship> {
    @Select("SELECT friend_id FROM t_friendship WHERE user_id = #{userId} AND deleted_at IS NULL")
    List<Long> listFriendIds(@Param("userId") Long userId);

    /**
     * 复活被软删的关系（同一对 user_id / friend_id 唯一约束无 WHERE 条件，
     * 必须在重新加好友时通过 UPDATE 而非 INSERT）。
     */
    @Update("""
        UPDATE t_friendship
        SET deleted_at = NULL, created_at = NOW(), remark = NULL
        WHERE user_id = #{userId} AND friend_id = #{friendId} AND deleted_at IS NOT NULL
        """)
    int reviveIfSoftDeleted(@Param("userId") Long userId, @Param("friendId") Long friendId);
}
