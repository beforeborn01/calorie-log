package com.calorielog.common.exception;

import lombok.Getter;

@Getter
public class BizException extends RuntimeException {
    private final int code;
    private final String bizMessage;

    public BizException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.code = errorCode.getCode();
        this.bizMessage = errorCode.getMessage();
    }

    public BizException(ErrorCode errorCode, String overrideMessage) {
        super(overrideMessage);
        this.code = errorCode.getCode();
        this.bizMessage = overrideMessage;
    }

    public BizException(int code, String message) {
        super(message);
        this.code = code;
        this.bizMessage = message;
    }
}
