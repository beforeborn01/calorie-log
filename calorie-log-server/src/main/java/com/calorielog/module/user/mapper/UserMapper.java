package com.calorielog.module.user.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.calorielog.module.user.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface UserMapper extends BaseMapper<User> {

    @Select("SELECT * FROM t_user WHERE phone = #{phone} AND deleted_at IS NULL LIMIT 1")
    User findByPhone(@Param("phone") String phone);

    @Select("SELECT * FROM t_user WHERE email = #{email} AND deleted_at IS NULL LIMIT 1")
    User findByEmail(@Param("email") String email);

    @Select("SELECT * FROM t_user WHERE wechat_openid = #{openid} AND deleted_at IS NULL LIMIT 1")
    User findByWechatOpenid(@Param("openid") String openid);
}
