package com.calorielog.module.settings.mapper;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.calorielog.module.settings.entity.NotificationSetting;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface NotificationSettingMapper extends BaseMapper<NotificationSetting> {
    default NotificationSetting findByUser(Long userId) {
        return selectOne(new QueryWrapper<NotificationSetting>()
                .eq("user_id", userId).last("LIMIT 1"));
    }
}
