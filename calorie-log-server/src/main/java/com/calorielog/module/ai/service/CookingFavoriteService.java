package com.calorielog.module.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.module.ai.dto.CookingFavoriteResponse;
import com.calorielog.module.ai.dto.SaveCookingFavoriteRequest;
import com.calorielog.module.ai.entity.CookingFavorite;
import com.calorielog.module.ai.mapper.CookingFavoriteMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CookingFavoriteService {

    private final CookingFavoriteMapper favoriteMapper;

    @Transactional
    public CookingFavoriteResponse add(Long userId, SaveCookingFavoriteRequest req) {
        // 先尝试复活软删行
        int revived = favoriteMapper.reviveIfSoftDeleted(
                userId, req.getFoodName(), req.getCookingMethod(), req.getContent());
        if (revived == 1) {
            return toResponse(loadByKey(userId, req.getFoodName(), req.getCookingMethod()));
        }
        CookingFavorite existing = loadByKey(userId, req.getFoodName(), req.getCookingMethod());
        if (existing != null) throw new BizException(ErrorCode.AI_FAVORITE_EXISTS);

        CookingFavorite f = new CookingFavorite();
        f.setUserId(userId);
        f.setFoodName(req.getFoodName());
        f.setCookingMethod(req.getCookingMethod());
        f.setContent(req.getContent());
        f.setCreatedAt(LocalDateTime.now());
        try {
            favoriteMapper.insert(f);
        } catch (DuplicateKeyException e) {
            throw new BizException(ErrorCode.AI_FAVORITE_EXISTS);
        }
        return toResponse(f);
    }

    public List<CookingFavoriteResponse> list(Long userId) {
        QueryWrapper<CookingFavorite> w = new QueryWrapper<>();
        w.eq("user_id", userId).orderByDesc("created_at");
        return favoriteMapper.selectList(w).stream().map(this::toResponse).toList();
    }

    @Transactional
    public void delete(Long userId, Long id) {
        CookingFavorite f = favoriteMapper.selectById(id);
        if (f == null || !f.getUserId().equals(userId)) {
            throw new BizException(ErrorCode.AI_FAVORITE_NOT_FOUND);
        }
        favoriteMapper.deleteById(id);
    }

    private CookingFavorite loadByKey(Long userId, String foodName, String method) {
        return favoriteMapper.selectOne(new QueryWrapper<CookingFavorite>()
                .eq("user_id", userId)
                .eq("food_name", foodName)
                .eq("cooking_method", method));
    }

    private CookingFavoriteResponse toResponse(CookingFavorite f) {
        CookingFavoriteResponse r = new CookingFavoriteResponse();
        r.setId(f.getId());
        r.setFoodName(f.getFoodName());
        r.setCookingMethod(f.getCookingMethod());
        r.setContent(f.getContent());
        r.setCreatedAt(f.getCreatedAt());
        return r;
    }
}
