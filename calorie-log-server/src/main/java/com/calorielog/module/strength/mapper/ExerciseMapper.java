package com.calorielog.module.strength.mapper;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.calorielog.module.strength.entity.Exercise;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface ExerciseMapper extends BaseMapper<Exercise> {

    /** 返回预设 + 当前用户自建（按中文 body_part 过滤） */
    default List<Exercise> listVisible(Long userId, String bodyPart, String keyword) {
        QueryWrapper<Exercise> qw = new QueryWrapper<>();
        qw.and(w -> w.eq("is_preset", true).or().eq("created_by", userId));
        if (bodyPart != null && !bodyPart.isBlank()) qw.eq("body_part", bodyPart);
        if (keyword != null && !keyword.isBlank()) qw.like("name", keyword);
        qw.orderByAsc("is_preset").orderByAsc("id");
        return selectList(qw);
    }

    /** 训练模块用：返回预设 + 该用户自建（默认只 popular） */
    @Select("SELECT * FROM t_exercise WHERE deleted_at IS NULL "
          + "AND (created_by IS NULL OR created_by = #{userId}) "
          + "AND (#{popularOnly} = false OR is_popular = TRUE OR is_custom = TRUE) "
          + "ORDER BY is_custom, name")
    List<Exercise> findVisibleToUser(@Param("userId") Long userId,
                                     @Param("popularOnly") boolean popularOnly);

    /** 训练模块用：按 category（英文）+ 名称模糊搜索 */
    @Select("""
            SELECT * FROM t_exercise
            WHERE deleted_at IS NULL
              AND (created_by IS NULL OR created_by = #{userId})
              AND (#{q} = '' OR name ILIKE CONCAT('%', #{q}, '%'))
              AND (#{category} = '' OR category = #{category})
              AND (#{popularOnly} = false OR is_popular = TRUE OR is_custom = TRUE OR #{q} <> '')
            ORDER BY is_custom DESC, is_popular DESC, name
            LIMIT #{limit}
            """)
    List<Exercise> search(@Param("userId") Long userId,
                          @Param("q") String q,
                          @Param("category") String category,
                          @Param("popularOnly") boolean popularOnly,
                          @Param("limit") int limit);
}
