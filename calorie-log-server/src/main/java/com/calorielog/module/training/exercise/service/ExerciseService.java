package com.calorielog.module.training.exercise.service;

import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.module.training.exercise.dto.ExerciseCatalogDTO;
import com.calorielog.module.training.exercise.dto.ExerciseCatalogRows;
import com.calorielog.module.training.exercise.dto.ExerciseDTO;
import com.calorielog.module.training.exercise.dto.SaveExerciseRequest;
import com.calorielog.module.strength.entity.Exercise;
import com.calorielog.module.strength.mapper.ExerciseMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service("trainingExerciseService")
@RequiredArgsConstructor
public class ExerciseService {

    private final ExerciseMapper exerciseMapper;

    public List<ExerciseDTO> list(Long userId, boolean popularOnly) {
        return exerciseMapper.findVisibleToUser(userId, popularOnly).stream()
                .map(this::toDTO).collect(Collectors.toList());
    }

    public List<ExerciseDTO> search(Long userId, String query, String category,
                                    boolean popularOnly, int limit) {
        String q = query == null ? "" : query.trim();
        String c = category == null ? "" : category.trim();
        int lim = Math.max(1, Math.min(limit <= 0 ? 100 : limit, 200));
        return exerciseMapper.search(userId, q, c, popularOnly, lim).stream()
                .map(this::toDTO).collect(Collectors.toList());
    }

    /** 动作库选择器：按 部位(中文)/小类/器械/关键词 过滤 */
    public List<ExerciseDTO> filter(Long userId, String bodyPart, Long subRegionId,
                                    String equipment, String query, int limit) {
        String bp = bodyPart == null ? "" : bodyPart.trim();
        String eq = equipment == null ? "" : equipment.trim();
        String q = query == null ? "" : query.trim();
        int lim = Math.max(1, Math.min(limit <= 0 ? 300 : limit, 600));
        return exerciseMapper.filter(userId, bp, subRegionId, eq, q, lim).stream()
                .map(this::toDTO).collect(Collectors.toList());
    }

    /** 大类固定展示顺序（与开练一致） */
    private static final List<String> BODY_PART_ORDER = List.of(
            "chest", "back", "legs", "shoulders", "traps", "biceps", "triceps",
            "calves", "forearms", "glutes", "core", "stretch", "cardio", "fullbody");

    /** 动作库目录树：部位 + 小类 + 器械（喂选择器左栏与筛选 chips） */
    public ExerciseCatalogDTO catalog(Long userId) {
        // 小类、器械按 大类 分组
        Map<String, List<ExerciseCatalogRows.SubRegionCount>> subsByBp = new LinkedHashMap<>();
        for (ExerciseCatalogRows.SubRegionCount s : exerciseMapper.subRegionCounts()) {
            subsByBp.computeIfAbsent(s.getBodyPart(), k -> new ArrayList<>()).add(s);
        }
        Map<String, List<ExerciseCatalogRows.EquipmentCount>> eqByBpCn = new LinkedHashMap<>();
        for (ExerciseCatalogRows.EquipmentCount eq : exerciseMapper.equipmentCounts(userId)) {
            eqByBpCn.computeIfAbsent(eq.getBodyPart(), k -> new ArrayList<>()).add(eq);
        }

        List<ExerciseCatalogDTO.BodyPart> nodes = new ArrayList<>();
        for (ExerciseCatalogRows.BodyPartCount bpc : exerciseMapper.bodyPartCounts(userId)) {
            ExerciseCatalogDTO.BodyPart node = new ExerciseCatalogDTO.BodyPart();
            node.setCode(bpc.getCode());
            node.setName(bpc.getName());
            node.setCount(bpc.getCount());
            // 小类（按 code 关联）
            List<ExerciseCatalogRows.SubRegionCount> subs = subsByBp.getOrDefault(bpc.getCode(), List.of());
            node.setSubRegions(subs.stream().map(s -> {
                ExerciseCatalogDTO.SubRegion sr = new ExerciseCatalogDTO.SubRegion();
                sr.setId(s.getId());
                sr.setName(s.getName());
                sr.setCount(s.getCount());
                return sr;
            }).collect(Collectors.toList()));
            // 器械（按中文 body_part 关联）
            List<ExerciseCatalogRows.EquipmentCount> eqs = eqByBpCn.getOrDefault(bpc.getName(), List.of());
            node.setEquipments(eqs.stream().map(e -> {
                ExerciseCatalogDTO.Equipment ec = new ExerciseCatalogDTO.Equipment();
                ec.setName(e.getName());
                ec.setCount(e.getCount());
                return ec;
            }).collect(Collectors.toList()));
            nodes.add(node);
        }
        // 按固定大类顺序排序，未在表中的排末尾
        nodes.sort((a, b) -> {
            int ia = BODY_PART_ORDER.indexOf(a.getCode());
            int ib = BODY_PART_ORDER.indexOf(b.getCode());
            return Integer.compare(ia < 0 ? 99 : ia, ib < 0 ? 99 : ib);
        });
        ExerciseCatalogDTO dto = new ExerciseCatalogDTO();
        dto.setBodyParts(nodes);
        return dto;
    }

    public ExerciseDTO get(Long userId, Long id) {
        Exercise e = exerciseMapper.selectById(id);
        if (e == null) throw new BizException(ErrorCode.EXERCISE_NOT_FOUND);
        if (e.getCreatedBy() != null && !e.getCreatedBy().equals(userId)) {
            throw new BizException(ErrorCode.EXERCISE_NO_PERMISSION);
        }
        ExerciseDTO d = toDTO(e);
        d.setSubRegions(exerciseMapper.subRegionNamesOf(id));  // 详情才查所属小类，避免列表 N+1
        return d;
    }

    public ExerciseDTO create(Long userId, SaveExerciseRequest req) {
        Exercise e = new Exercise();
        // id auto-generated by DB (BIGSERIAL)
        e.setCreatedBy(userId);
        e.setName(req.getName());
        e.setCategory(req.getCategory());
        e.setBodyPart(bodyPartOf(req.getCategory()));
        e.setPrimaryMuscles(joinMuscles(req.getPrimaryMuscles()));
        e.setSecondaryMuscles(joinMuscles(req.getSecondaryMuscles()));
        e.setDifficulty(req.getDifficulty() != null ? req.getDifficulty() : 1);
        e.setInstructions(req.getInstructions());
        e.setTips(req.getTips());
        e.setIsPreset(false);
        e.setIsCustom(true);
        exerciseMapper.insert(e);
        return toDTO(e);
    }

    public ExerciseDTO update(Long userId, Long id, SaveExerciseRequest req) {
        Exercise e = exerciseMapper.selectById(id);
        if (e == null) throw new BizException(ErrorCode.EXERCISE_NOT_FOUND);
        if (e.getCreatedBy() == null || !e.getCreatedBy().equals(userId)) {
            throw new BizException(ErrorCode.EXERCISE_NO_PERMISSION);
        }
        if (req.getName() != null) e.setName(req.getName());
        if (req.getCategory() != null) {
            e.setCategory(req.getCategory());
            e.setBodyPart(bodyPartOf(req.getCategory()));
        }
        if (req.getPrimaryMuscles() != null) e.setPrimaryMuscles(joinMuscles(req.getPrimaryMuscles()));
        if (req.getSecondaryMuscles() != null) e.setSecondaryMuscles(joinMuscles(req.getSecondaryMuscles()));
        if (req.getDifficulty() != null) e.setDifficulty(req.getDifficulty());
        if (req.getInstructions() != null) e.setInstructions(req.getInstructions());
        if (req.getTips() != null) e.setTips(req.getTips());
        exerciseMapper.updateById(e);
        return toDTO(e);
    }

    public void delete(Long userId, Long id) {
        Exercise e = exerciseMapper.selectById(id);
        if (e == null) throw new BizException(ErrorCode.EXERCISE_NOT_FOUND);
        if (e.getCreatedBy() == null || !e.getCreatedBy().equals(userId)) {
            throw new BizException(ErrorCode.EXERCISE_NO_PERMISSION);
        }
        exerciseMapper.deleteById(id);
    }

    public ExerciseDTO toDTO(Exercise e) {
        ExerciseDTO d = new ExerciseDTO();
        d.setId(e.getId());
        d.setName(e.getName());
        d.setCategory(e.getCategory());
        d.setBodyPart(e.getBodyPart());
        d.setPrimaryMuscles(splitMuscles(e.getPrimaryMuscles()));
        d.setSecondaryMuscles(splitMuscles(e.getSecondaryMuscles()));
        d.setDifficulty(e.getDifficulty());
        d.setInstructions(e.getInstructions());
        d.setTips(e.getTips());
        d.setIsCustom(Boolean.TRUE.equals(e.getIsCustom()));
        d.setIsPopular(Boolean.TRUE.equals(e.getIsPopular()));
        d.setImageUrl(e.getImageUrl());
        d.setEquipment(e.getEquipment());
        d.setEquipmentDetail(e.getEquipmentDetail());
        d.setTargetMuscle(e.getTargetMuscle());
        d.setMet(e.getMet());
        d.setDetailSections(e.getDetailSections());
        d.setCreatedAt(e.getCreatedAt());
        d.setUpdatedAt(e.getUpdatedAt());
        return d;
    }

    private static String joinMuscles(List<String> muscles) {
        if (muscles == null || muscles.isEmpty()) return "";
        return String.join(",", muscles);
    }

    private static List<String> splitMuscles(String csv) {
        if (csv == null || csv.isBlank()) return List.of();
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    /** 英文 category 反推中文 body_part（与 V9 迁移逻辑保持一致） */
    private static final Map<String, String> CATEGORY_TO_BODYPART = Map.of(
            "chest", "胸部",
            "back", "背部",
            "legs", "腿部",
            "shoulders", "肩部",
            "arms", "手臂",
            "core", "核心",
            "cardio", "有氧"
    );

    public static String bodyPartOf(String category) {
        if (category == null) return "其他";
        return CATEGORY_TO_BODYPART.getOrDefault(category, "其他");
    }
}
