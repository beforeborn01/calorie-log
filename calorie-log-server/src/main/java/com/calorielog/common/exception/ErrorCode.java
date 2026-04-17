package com.calorielog.common.exception;

import lombok.Getter;

@Getter
public enum ErrorCode {
    SUCCESS(200, "success"),

    // 通用 400xx
    BAD_REQUEST(40000, "请求参数错误"),
    PARAM_INVALID(40001, "参数校验失败"),
    UNAUTHORIZED(40100, "未登录或登录已过期"),
    TOKEN_INVALID(40101, "Token 无效"),
    TOKEN_EXPIRED(40102, "Token 已过期"),
    TOKEN_REVOKED(40103, "Token 已失效，请重新登录"),
    FORBIDDEN(40300, "无权访问"),
    NOT_FOUND(40400, "资源不存在"),
    METHOD_NOT_ALLOWED(40500, "请求方法不允许"),
    CONFLICT(40900, "资源冲突"),

    // 用户 401xx
    USER_NOT_FOUND(41001, "用户不存在"),
    USER_ALREADY_EXISTS(41002, "用户已存在"),
    PASSWORD_INCORRECT(41003, "用户名或密码错误"),
    VERIFY_CODE_INCORRECT(41004, "验证码错误"),
    VERIFY_CODE_EXPIRED(41005, "验证码已过期"),
    VERIFY_CODE_RATE_LIMIT(41006, "验证码发送过于频繁，请稍后再试"),
    USER_DISABLED(41007, "账号已被禁用"),
    PHONE_ALREADY_BOUND(41008, "手机号已被其他账号绑定"),
    EMAIL_ALREADY_BOUND(41009, "邮箱已被其他账号绑定"),
    IDENTIFIER_FORMAT_INVALID(41010, "手机号或邮箱格式错误"),

    // 微信 402xx
    WECHAT_AUTH_FAILED(42001, "微信授权失败"),
    WECHAT_TEMP_TOKEN_INVALID(42002, "微信临时 Token 无效"),
    WECHAT_BIND_REQUIRED(42003, "请绑定手机号"),

    // 食物 403xx
    FOOD_NOT_FOUND(43001, "食物不存在"),
    FOOD_NO_PERMISSION(43002, "无权访问该食物"),

    // 记录 404xx
    RECORD_NOT_FOUND(44001, "记录不存在"),
    RECORD_NO_PERMISSION(44002, "无权操作该记录"),

    // 目标 405xx
    GOAL_NOT_FOUND(45001, "未设置健身目标"),
    GOAL_PROFILE_INCOMPLETE(45002, "请先完善个人信息（性别/年龄/身高/体重/活动量）"),

    // 训练 406xx
    NOT_TRAINING_DAY(46001, "当前为休息日，无法记录力量训练"),
    EXERCISE_NOT_FOUND(46002, "训练动作不存在"),

    // 社交 407xx
    FRIEND_REQUEST_EXISTS(47001, "已存在待处理的好友请求"),
    FRIEND_ALREADY_EXISTS(47002, "你们已经是好友"),
    FRIEND_REQUEST_NOT_FOUND(47003, "好友请求不存在"),
    CANNOT_ADD_SELF(47004, "不能添加自己为好友"),

    // 并发 408xx
    CONCURRENT_MODIFICATION(48001, "操作冲突，请重试"),

    // AI 409xx
    AI_IMAGE_TOO_LARGE(49001, "图片过大，请压缩后重试（最大 2MB）"),
    AI_IMAGE_INVALID(49002, "图片格式错误或无法解析"),
    AI_RECOGNITION_FAILED(49003, "食物识别失败，请手动录入"),
    AI_RECOGNITION_EMPTY(49004, "未识别到食物"),
    AI_LLM_UNAVAILABLE(49005, "烹饪推荐服务暂不可用"),
    AI_FAVORITE_EXISTS(49006, "已收藏该烹饪方法"),
    AI_FAVORITE_NOT_FOUND(49007, "收藏记录不存在"),

    // 服务端 500xx
    INTERNAL_ERROR(50000, "服务器内部错误"),
    EXTERNAL_SERVICE_ERROR(50001, "外部服务异常"),
    RATE_LIMITED(50002, "请求过于频繁");

    private final int code;
    private final String message;

    ErrorCode(int code, String message) {
        this.code = code;
        this.message = message;
    }
}
