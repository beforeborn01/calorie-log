package com.calorielog.module.food.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.calorielog.module.food.entity.Food;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface FoodMapper extends BaseMapper<Food> {

    /**
     * 按关键词搜索（名称优先，其次别名），系统食物全局可见，用户自建仅本人可见。
     */
    @Select({
        "<script>",
        "SELECT * FROM (",
        "  SELECT t_food.*, (",
        "    CASE WHEN name = #{keyword} THEN 0",
        "         WHEN name ILIKE CONCAT(#{keyword}, '%') THEN 1",
        "         WHEN name ILIKE CONCAT('%', #{keyword}, '%') THEN 2",
        "         ELSE 3 END",
        "  ) AS match_rank",
        "  FROM t_food",
        "  WHERE deleted_at IS NULL",
        "  AND (",
        "    to_tsvector('simple', name) @@ plainto_tsquery('simple', #{keyword})",
        "    OR to_tsvector('simple', coalesce(alias, '')) @@ plainto_tsquery('simple', #{keyword})",
        "    OR name ILIKE CONCAT('%', #{keyword}, '%')",
        "    OR alias ILIKE CONCAT('%', #{keyword}, '%')",
        "  )",
        "  AND (data_source &lt;&gt; 'user' OR created_by = #{userId})",
        ") ranked",
        "ORDER BY match_rank ASC, id ASC",
        "</script>"
    })
    IPage<Food> searchByKeyword(Page<Food> page, @Param("keyword") String keyword, @Param("userId") Long userId);

    @Select("SELECT * FROM t_food WHERE barcode = #{barcode} AND deleted_at IS NULL LIMIT 1")
    Food findByBarcode(@Param("barcode") String barcode);
}
