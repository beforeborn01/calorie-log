package com.calorielog.module.settings.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.time.LocalTime;

@Data
public class NotificationSettingDto {
    private Boolean breakfastEnabled;
    @JsonFormat(pattern = "HH:mm")
    private LocalTime breakfastTime;

    private Boolean lunchEnabled;
    @JsonFormat(pattern = "HH:mm")
    private LocalTime lunchTime;

    private Boolean dinnerEnabled;
    @JsonFormat(pattern = "HH:mm")
    private LocalTime dinnerTime;

    @Pattern(regexp = "daily|weekday|weekend", message = "frequency 仅支持 daily/weekday/weekend")
    private String frequency;
}
