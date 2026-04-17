package com.calorielog.module.social.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.calorielog.module.social.entity.FriendRequest;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface FriendRequestMapper extends BaseMapper<FriendRequest> {

    /**
     * 把同一对 (from, to) 的历史终态请求置为 EXPIRED，给本次 accept/reject
     * 腾出唯一约束 (from, to, status) 的 slot。
     */
    @Update("""
        UPDATE t_friend_request SET status = 3
        WHERE from_user_id = #{fromUserId} AND to_user_id = #{toUserId}
          AND status IN (1, 2) AND id <> #{excludeId}
        """)
    int expirePriorTerminal(@Param("fromUserId") Long fromUserId,
                            @Param("toUserId") Long toUserId,
                            @Param("excludeId") Long excludeId);
}
