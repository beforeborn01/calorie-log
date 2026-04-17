package com.calorielog.module.ai.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.calorielog.module.ai.entity.CookingFavorite;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface CookingFavoriteMapper extends BaseMapper<CookingFavorite> {

    /** 若历史软删行存在，复活以绕过 UNIQUE(user_id, food_name, cooking_method) 约束。 */
    @Update("""
        UPDATE t_cooking_favorite SET deleted_at = NULL, created_at = NOW(), content = #{content}
        WHERE user_id = #{userId} AND food_name = #{foodName} AND cooking_method = #{cookingMethod}
          AND deleted_at IS NOT NULL
        """)
    int reviveIfSoftDeleted(@Param("userId") Long userId,
                            @Param("foodName") String foodName,
                            @Param("cookingMethod") String cookingMethod,
                            @Param("content") String content);
}
