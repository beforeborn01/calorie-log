package com.calorielog.module.strength.mapper;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.calorielog.module.strength.entity.Exercise;
import com.calorielog.module.training.exercise.dto.ExerciseCatalogRows;
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

    /** 动作库选择器：按 部位(中文)/小类/器械/关键词 过滤 */
    @Select("""
            SELECT * FROM t_exercise
            WHERE deleted_at IS NULL
              AND (created_by IS NULL OR created_by = #{userId})
              AND (#{bodyPart} = '' OR body_part = #{bodyPart})
              AND (#{equipment} = '' OR equipment = #{equipment})
              AND (#{q} = '' OR name ILIKE CONCAT('%', #{q}, '%'))
              AND (CAST(#{subRegionId} AS BIGINT) IS NULL
                   OR EXISTS (SELECT 1 FROM t_exercise_sub_region es
                              WHERE es.exercise_id = t_exercise.id
                                AND es.sub_region_id = #{subRegionId}))
            ORDER BY is_custom DESC, equipment, name
            LIMIT #{limit}
            """)
    List<Exercise> filter(@Param("userId") Long userId,
                          @Param("bodyPart") String bodyPart,
                          @Param("subRegionId") Long subRegionId,
                          @Param("equipment") String equipment,
                          @Param("q") String q,
                          @Param("limit") int limit);

    /** catalog：各大类动作计数 */
    @Select("""
            SELECT category AS code, body_part AS name, COUNT(*) AS count
            FROM t_exercise
            WHERE deleted_at IS NULL AND (created_by IS NULL OR created_by = #{userId})
            GROUP BY category, body_part
            """)
    List<ExerciseCatalogRows.BodyPartCount> bodyPartCounts(@Param("userId") Long userId);

    /** catalog：各小类动作计数 */
    @Select("""
            SELECT s.id, s.body_part AS bodyPart, s.name_cn AS name,
                   COUNT(es.exercise_id) AS count
            FROM t_sub_region s
            LEFT JOIN t_exercise_sub_region es ON es.sub_region_id = s.id
            GROUP BY s.id, s.body_part, s.name_cn, s.sort
            ORDER BY s.body_part, s.sort
            """)
    List<ExerciseCatalogRows.SubRegionCount> subRegionCounts();

    /** catalog：各 (大类, 器械) 动作计数 */
    @Select("""
            SELECT body_part AS bodyPart, equipment AS name, COUNT(*) AS count
            FROM t_exercise
            WHERE deleted_at IS NULL AND (created_by IS NULL OR created_by = #{userId})
              AND equipment IS NOT NULL
            GROUP BY body_part, equipment
            ORDER BY body_part, COUNT(*) DESC
            """)
    List<ExerciseCatalogRows.EquipmentCount> equipmentCounts(@Param("userId") Long userId);

    /** 某动作所属的小类中文名（按 sort） */
    @Select("""
            SELECT s.name_cn FROM t_sub_region s
            JOIN t_exercise_sub_region es ON es.sub_region_id = s.id
            WHERE es.exercise_id = #{exerciseId}
            ORDER BY s.sort
            """)
    List<String> subRegionNamesOf(@Param("exerciseId") Long exerciseId);
}
