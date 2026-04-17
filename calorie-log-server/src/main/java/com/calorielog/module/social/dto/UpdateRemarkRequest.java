package com.calorielog.module.social.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateRemarkRequest {
    @Size(max = 50)
    private String remark;
}
