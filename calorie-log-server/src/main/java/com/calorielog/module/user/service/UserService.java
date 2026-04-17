package com.calorielog.module.user.service;

import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.common.utils.IdentifierUtils;
import com.calorielog.module.user.dto.UpdateProfileRequest;
import com.calorielog.module.user.dto.UserProfileResponse;
import com.calorielog.module.user.entity.User;
import com.calorielog.module.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserMapper userMapper;
    private final AuthService authService;

    public UserProfileResponse getProfile(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BizException(ErrorCode.USER_NOT_FOUND);
        return toResponse(user);
    }

    public UserProfileResponse updateProfile(Long userId, UpdateProfileRequest req) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BizException(ErrorCode.USER_NOT_FOUND);

        if (req.getNickname() != null) user.setNickname(req.getNickname());
        if (req.getAvatarUrl() != null) user.setAvatarUrl(req.getAvatarUrl());
        if (req.getGender() != null) user.setGender(req.getGender());
        if (req.getAge() != null) user.setAge(req.getAge());
        if (req.getHeight() != null) user.setHeight(req.getHeight());
        if (req.getWeight() != null) user.setWeight(req.getWeight());
        if (req.getActivityLevel() != null) user.setActivityLevel(req.getActivityLevel());
        if (req.getTimezone() != null) user.setTimezone(req.getTimezone());

        int rows = userMapper.updateById(user);
        if (rows == 0) throw new BizException(ErrorCode.CONCURRENT_MODIFICATION);
        return toResponse(userMapper.selectById(userId));
    }

    public UserProfileResponse toResponse(User user) {
        UserProfileResponse r = new UserProfileResponse();
        r.setId(user.getId());
        r.setPhone(IdentifierUtils.maskPhone(user.getPhone()));
        r.setEmail(IdentifierUtils.maskEmail(user.getEmail()));
        r.setNickname(user.getNickname());
        r.setAvatarUrl(user.getAvatarUrl());
        r.setGender(user.getGender());
        r.setAge(user.getAge());
        r.setHeight(user.getHeight());
        r.setWeight(user.getWeight());
        r.setActivityLevel(user.getActivityLevel());
        r.setTimezone(user.getTimezone());
        r.setProfileComplete(authService.isProfileComplete(user));
        r.setWechatBound(user.getWechatOpenid() != null && !user.getWechatOpenid().isBlank());
        return r;
    }
}
