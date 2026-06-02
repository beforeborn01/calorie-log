package com.calorielog.module.user.service;

import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.common.utils.IdentifierUtils;
import com.calorielog.module.user.dto.UpdateProfileRequest;
import com.calorielog.module.user.dto.UserProfileResponse;
import com.calorielog.module.user.entity.User;
import com.calorielog.module.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final Set<String> ALLOWED_AVATAR_TYPES = Set.of("image/jpeg", "image/png", "image/webp", "image/gif");

    private final UserMapper userMapper;
    private final AuthService authService;

    @Value("${app.upload.avatar-dir:uploads/avatars}")
    private String avatarDir;

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

    public UserProfileResponse updateAvatar(Long userId, MultipartFile file) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BizException(ErrorCode.USER_NOT_FOUND);
        if (file == null || file.isEmpty()) {
            throw new BizException(ErrorCode.PARAM_INVALID, "请选择头像文件");
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!ALLOWED_AVATAR_TYPES.contains(contentType)) {
            throw new BizException(ErrorCode.PARAM_INVALID, "头像仅支持 jpg/png/webp/gif");
        }

        String ext = switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> ".img";
        };
        String filename = userId + "-" + UUID.randomUUID().toString().replace("-", "") + ext;
        Path dir = Paths.get(avatarDir).toAbsolutePath().normalize();
        Path dest = dir.resolve(filename).normalize();
        if (!dest.startsWith(dir)) {
            throw new BizException(ErrorCode.PARAM_INVALID, "文件名非法");
        }
        try {
            Files.createDirectories(dir);
            file.transferTo(dest);
        } catch (IOException e) {
            throw new BizException(ErrorCode.INTERNAL_ERROR, "头像保存失败");
        }

        user.setAvatarUrl("/api/v1/users/avatar/" + filename);
        int rows = userMapper.updateById(user);
        if (rows == 0) throw new BizException(ErrorCode.CONCURRENT_MODIFICATION);
        return toResponse(userMapper.selectById(userId));
    }

    public Resource loadAvatar(String filename) {
        if (filename == null || filename.contains("/") || filename.contains("..")) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        Path file = Paths.get(avatarDir).toAbsolutePath().normalize().resolve(filename).normalize();
        if (!file.startsWith(Paths.get(avatarDir).toAbsolutePath().normalize())) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        try {
            Resource resource = new UrlResource(file.toUri());
            if (!resource.exists() || !resource.isReadable()) throw new BizException(ErrorCode.NOT_FOUND);
            return resource;
        } catch (MalformedURLException e) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
    }

    public String avatarContentType(String filename) {
        String lower = filename == null ? "" : filename.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".gif")) return "image/gif";
        return "image/jpeg";
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
