package com.calorielog.module.settings.service;

import com.calorielog.module.settings.dto.NotificationSettingDto;
import com.calorielog.module.settings.entity.NotificationSetting;
import com.calorielog.module.settings.mapper.NotificationSettingMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;

@Service
@RequiredArgsConstructor
public class NotificationSettingService {

    private final NotificationSettingMapper mapper;

    public NotificationSettingDto get(Long userId) {
        NotificationSetting s = mapper.findByUser(userId);
        if (s == null) return defaults();
        NotificationSettingDto dto = new NotificationSettingDto();
        BeanUtils.copyProperties(s, dto);
        return dto;
    }

    @Transactional
    public NotificationSettingDto save(Long userId, NotificationSettingDto req) {
        NotificationSetting s = mapper.findByUser(userId);
        if (s == null) {
            s = new NotificationSetting();
            s.setUserId(userId);
            applyDefaults(s);
        }
        if (req.getBreakfastEnabled() != null) s.setBreakfastEnabled(req.getBreakfastEnabled());
        if (req.getBreakfastTime() != null) s.setBreakfastTime(req.getBreakfastTime());
        if (req.getLunchEnabled() != null) s.setLunchEnabled(req.getLunchEnabled());
        if (req.getLunchTime() != null) s.setLunchTime(req.getLunchTime());
        if (req.getDinnerEnabled() != null) s.setDinnerEnabled(req.getDinnerEnabled());
        if (req.getDinnerTime() != null) s.setDinnerTime(req.getDinnerTime());
        if (req.getFrequency() != null) s.setFrequency(req.getFrequency());
        if (s.getId() == null) mapper.insert(s);
        else mapper.updateById(s);
        return get(userId);
    }

    private NotificationSettingDto defaults() {
        NotificationSettingDto dto = new NotificationSettingDto();
        dto.setBreakfastEnabled(true);
        dto.setBreakfastTime(LocalTime.of(8, 0));
        dto.setLunchEnabled(true);
        dto.setLunchTime(LocalTime.of(12, 0));
        dto.setDinnerEnabled(true);
        dto.setDinnerTime(LocalTime.of(18, 30));
        dto.setFrequency("daily");
        return dto;
    }

    private void applyDefaults(NotificationSetting s) {
        s.setBreakfastEnabled(true);
        s.setBreakfastTime(LocalTime.of(8, 0));
        s.setLunchEnabled(true);
        s.setLunchTime(LocalTime.of(12, 0));
        s.setDinnerEnabled(true);
        s.setDinnerTime(LocalTime.of(18, 30));
        s.setFrequency("daily");
    }
}
