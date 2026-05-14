package com.calorielog.module.training.quicklog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class QuickLogRequest {

    @NotBlank
    @Size(max = 2000)
    private String text;

    /** 可选：客户端时区下的当前时间，仅在文本未指明时间时用作默认值 */
    private LocalDateTime now;
}
