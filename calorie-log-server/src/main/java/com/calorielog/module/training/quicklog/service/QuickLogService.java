package com.calorielog.module.training.quicklog.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.module.training.exercise.dto.ExerciseDTO;
import com.calorielog.module.strength.entity.Exercise;
import com.calorielog.module.strength.mapper.ExerciseMapper;
import com.calorielog.module.training.exercise.service.ExerciseService;
import com.calorielog.module.ai.llm.LlmClient;
import com.calorielog.module.training.quicklog.dto.QuickLogRequest;
import com.calorielog.module.training.quicklog.dto.QuickLogResponse;
import com.calorielog.module.training.quicklog.parser.ExerciseMatcher;
import com.calorielog.module.training.quicklog.parser.ParsedEntry;
import com.calorielog.module.training.quicklog.parser.QuickLogParser;
import com.calorielog.module.training.session.dto.CompletedSetDTO;
import com.calorielog.module.training.session.dto.ExerciseSessionDTO;
import com.calorielog.module.training.session.dto.SaveSessionRequest;
import com.calorielog.module.training.session.dto.WorkoutSessionDTO;
import com.calorielog.module.training.session.service.WorkoutSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 补录编排：
 *   1. 正则解析为 ParsedEntry 列表
 *   2. ExerciseMatcher 做模糊匹配
 *   3. 未匹配的交给 LLM 兜底（可选）
 *   4. LLM 仍未匹配 → 自动新建用户自定义动作（同名去重）
 *   5. 组装 SaveSessionRequest，调用 SessionService.create() 落库
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QuickLogService {

    private final QuickLogParser parser;
    private final ExerciseMatcher matcher;
    private final ExerciseMapper exerciseMapper;
    private final ExerciseService exerciseService;
    private final WorkoutSessionService sessionService;
    private final LlmClient llmClient;
    private final ObjectMapper jsonMapper = new ObjectMapper();

    private static final double LOW_CONFIDENCE = 0.7;

    @Transactional
    public QuickLogResponse quickLog(Long userId, QuickLogRequest req) {
        List<String> notes = new ArrayList<>();
        List<Exercise> createdExercises = new ArrayList<>();

        // 1) 正则解析
        QuickLogParser.ParseResult parsed = parser.parse(req.getText(),
                req.getNow() != null ? req.getNow() : LocalDateTime.now());

        if (parsed.entries.isEmpty()) {
            throw new BizException(ErrorCode.BAD_REQUEST, "无法识别训练内容，请尝试：\"三组俯卧撑，每组10个\"");
        }
        notes.add(String.format("正则识别到 %d 条动作", parsed.entries.size()));

        // 2) 加载用户可见动作库 + 模糊匹配
        List<Exercise> candidates = matcher.loadCandidates(userId);
        for (ParsedEntry e : parsed.entries) {
            ExerciseMatcher.MatchResult m = matcher.match(e.getRawName(), candidates);
            if (m != null) {
                e.setExerciseId(m.exerciseId);
                e.setMatchConfidence(m.confidence);
            }
        }

        // 3) LLM 兜底（仅对未匹配/低置信度）
        List<ParsedEntry> needsLlm = new ArrayList<>();
        for (ParsedEntry e : parsed.entries) {
            if (e.getExerciseId() == null || (e.getMatchConfidence() != null && e.getMatchConfidence() < LOW_CONFIDENCE)) {
                needsLlm.add(e);
            }
        }
        if (!needsLlm.isEmpty() && llmClient.isEnabled()) {
            try {
                tryLlmFallback(needsLlm, candidates);
                notes.add("LLM 兜底 " + needsLlm.size() + " 条");
            } catch (Exception ex) {
                log.warn("LLM fallback failed: {}", ex.getMessage());
                notes.add("LLM 调用失败，已忽略：" + ex.getMessage());
            }
        } else if (!needsLlm.isEmpty()) {
            notes.add("LLM 未启用，" + needsLlm.size() + " 条动作走自动创建");
        }

        // 4) 仍未匹配 → 自动创建用户自定义动作（同名去重）
        Map<String, Long> autoCreated = new HashMap<>();
        for (ParsedEntry e : parsed.entries) {
            if (e.getExerciseId() != null) continue;
            String name = e.getRawName();
            if (name == null || name.isBlank()) continue;

            // 先在用户已有自定义动作里找同名（含此次新建的）
            Long existId = autoCreated.get(name);
            if (existId == null) {
                for (Exercise c : candidates) {
                    if (Boolean.TRUE.equals(c.getIsCustom()) && name.equalsIgnoreCase(c.getName())) {
                        existId = c.getId();
                        break;
                    }
                }
            }
            if (existId == null) {
                Exercise created = createCustomExercise(userId, name, e.getInferredCategory(), e.getInferredPrimaryMuscles());
                existId = created.getId();
                autoCreated.put(name, existId);
                createdExercises.add(created);
                candidates.add(created);
                notes.add("已为你新建动作：" + name);
            }
            e.setExerciseId(existId);
        }

        // 5) 组装 session（id 由 DB BIGSERIAL 自动生成）
        SaveSessionRequest sreq = new SaveSessionRequest();
        sreq.setName(buildSessionName(parsed.entries, parsed.occurredAt));
        sreq.setStatus("completed");
        sreq.setStartTime(parsed.occurredAt);
        sreq.setEndTime(parsed.occurredAt);
        sreq.setDuration(0);
        sreq.setSource("quick_log");
        sreq.setRawText(req.getText());

        Map<Long, ExerciseSessionDTO> byExId = new HashMap<>();
        List<ExerciseSessionDTO> exDtos = new ArrayList<>();
        for (ParsedEntry e : parsed.entries) {
            if (e.getExerciseId() == null) continue;
            // 合并同一动作多次出现
            ExerciseSessionDTO ed = byExId.get(e.getExerciseId());
            if (ed == null) {
                ed = new ExerciseSessionDTO();
                ed.setExerciseId(e.getExerciseId());
                ed.setPlannedSets(0);
                ed.setCompletedSets(new ArrayList<>());
                byExId.put(e.getExerciseId(), ed);
                exDtos.add(ed);
            }
            int existingSetCount = ed.getCompletedSets().size();
            int sets = Math.max(1, e.getSets() != null ? e.getSets() : 1);
            for (int i = 1; i <= sets; i++) {
                CompletedSetDTO cs = new CompletedSetDTO();
                cs.setSetNumber(existingSetCount + i);
                cs.setReps(e.getReps() != null ? e.getReps() : 0);
                cs.setWeight(e.getWeight() != null ? e.getWeight() : BigDecimal.ZERO);
                cs.setIsCompleted(true);
                cs.setCompletedAt(parsed.occurredAt);
                ed.getCompletedSets().add(cs);
            }
            ed.setPlannedSets(ed.getCompletedSets().size());
        }
        sreq.setExercises(exDtos);

        WorkoutSessionDTO dto = sessionService.create(userId, sreq);

        QuickLogResponse resp = new QuickLogResponse();
        resp.setSession(dto);
        resp.setNewExercises(createdExercises.stream().map(exerciseService::toDTO).toList());
        resp.setNotes(notes);
        return resp;
    }

    private void tryLlmFallback(List<ParsedEntry> entries, List<Exercise> candidates) {
        // 给 LLM 一个精简的候选清单（top 100），让它从中挑或回新建建议
        List<Map<String, String>> dict = new ArrayList<>();
        int max = Math.min(candidates.size(), 150);
        for (int i = 0; i < max; i++) {
            Exercise c = candidates.get(i);
            dict.add(Map.of("id", String.valueOf(c.getId()), "name", c.getName()));
        }
        List<String> rawNames = new ArrayList<>();
        for (ParsedEntry e : entries) rawNames.add(e.getRawName());

        String systemPrompt = """
                你是健身动作匹配助手。给定用户写的动作名（中文为主，可能含别名/俗称/错别字），
                以及一个动作字典，对每个输入名字尝试映射到字典中最合理的一条。
                如果字典里没有合适的，请给出一个新动作的简要信息以便系统创建。
                只返回 JSON，不要解释，不要 Markdown。
                """;

        String userPrompt;
        try {
            userPrompt = jsonMapper.writeValueAsString(Map.of(
                    "format", Map.of(
                            "match_existing", "{\"input\":\"原文\",\"exercise_id\":\"字典id\"}",
                            "create_new", "{\"input\":\"原文\",\"new_exercise\":{\"name\":\"标准名\",\"category\":\"chest|back|shoulders|arms|legs|core|cardio|other\",\"primary_muscles\":[\"...\"]}}"
                    ),
                    "rules", List.of(
                            "muscle 取值：chest/back/shoulders/biceps/triceps/legs/quadriceps/hamstrings/glutes/calves/core/abs/lower_back/full_body",
                            "返回数组，长度与 inputs 相同，按顺序对应",
                            "仅返回纯 JSON 数组"
                    ),
                    "dictionary_preview", dict,
                    "inputs", rawNames
            ));
        } catch (Exception ex) {
            return;
        }

        String content = llmClient.chat(systemPrompt, userPrompt);
        if (content == null || content.isBlank()) return;

        // 容错：模型有时还是会带 ```json...```，去掉
        content = content.replaceAll("(?s)```(?:json)?\\s*", "").replaceAll("```", "").trim();
        try {
            JsonNode arr = jsonMapper.readTree(content);
            if (!arr.isArray()) return;
            for (int i = 0; i < entries.size() && i < arr.size(); i++) {
                ParsedEntry e = entries.get(i);
                JsonNode item = arr.get(i);
                String exIdStr = item.path("exercise_id").asText(null);
                Long exId = null;
                if (exIdStr != null && !exIdStr.isBlank()) {
                    try { exId = Long.parseLong(exIdStr); } catch (NumberFormatException ignore) {}
                }
                if (exId != null) {
                    Long exIdFinal = exId;
                    // 校验 id 真在用户可见集合里
                    boolean ok = candidates.stream().anyMatch(c -> c.getId().equals(exIdFinal));
                    if (ok) {
                        e.setExerciseId(exId);
                        e.setMatchConfidence(0.9);
                        continue;
                    }
                }
                JsonNode ne = item.path("new_exercise");
                if (ne.isObject()) {
                    String name = ne.path("name").asText(e.getRawName());
                    String cat = ne.path("category").asText("other");
                    List<String> muscles = new ArrayList<>();
                    JsonNode pm = ne.path("primary_muscles");
                    if (pm.isArray()) for (JsonNode n : pm) muscles.add(n.asText());
                    e.setRawName(name);
                    e.setInferredCategory(cat);
                    e.setInferredPrimaryMuscles(muscles);
                }
            }
        } catch (Exception ex) {
            log.warn("LLM response not valid json: {}", content);
        }
    }

    private Exercise createCustomExercise(Long userId, String name, String category, List<String> primaryMuscles) {
        Exercise e = new Exercise();
        // id auto-generated by DB (BIGSERIAL)
        String cat = category != null && !category.isBlank() ? category : "other";
        e.setCreatedBy(userId);
        e.setName(name);
        e.setCategory(cat);
        e.setBodyPart(com.calorielog.module.training.exercise.service.ExerciseService.bodyPartOf(cat));
        e.setPrimaryMuscles(primaryMuscles != null && !primaryMuscles.isEmpty()
                ? String.join(",", primaryMuscles) : "");
        e.setSecondaryMuscles("");
        e.setDifficulty(2);
        e.setInstructions("用户从补录中创建");
        e.setTips("");
        e.setIsPreset(false);
        e.setIsCustom(true);
        exerciseMapper.insert(e);
        return e;
    }

    private String buildSessionName(List<ParsedEntry> entries, LocalDateTime when) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MM月dd日 HH:mm");
        String top = entries.stream()
                .map(ParsedEntry::getRawName)
                .filter(s -> s != null && !s.isBlank())
                .limit(2)
                .reduce((a, b) -> a + "+" + b)
                .orElse("训练");
        if (entries.size() > 2) top += " 等";
        return when.format(fmt) + " · " + top + "（补录）";
    }
}
