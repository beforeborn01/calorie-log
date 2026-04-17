package com.calorielog.module.ai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RecognizeRequest {
    /** Base64 图片（含或不含 data:image 前缀皆可，最大 ~2.7MB base64 ≈ 2MB 原图） */
    @NotBlank
    private String imageBase64;
}
