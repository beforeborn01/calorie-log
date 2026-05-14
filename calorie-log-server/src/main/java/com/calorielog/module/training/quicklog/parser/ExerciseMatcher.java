package com.calorielog.module.training.quicklog.parser;

import com.calorielog.module.strength.entity.Exercise;
import com.calorielog.module.strength.mapper.ExerciseMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * 把 ParsedEntry.rawName 映射到 t_exercise.id。
 * 三层匹配：精确（用户自定义优先）→ 子串包含 → 字符级相似度。
 */
@Component
@RequiredArgsConstructor
public class ExerciseMatcher {

    private final ExerciseMapper exerciseMapper;

    public static class MatchResult {
        public final Long exerciseId;
        public final double confidence;
        public final boolean ambiguous;  // 多个高分候选
        public MatchResult(Long id, double c, boolean a) {
            this.exerciseId = id; this.confidence = c; this.ambiguous = a;
        }
    }

    /** 查并缓存当前用户可见的全部动作（每次 quick-log 请求做一次） */
    public List<Exercise> loadCandidates(Long userId) {
        // 补录场景里需要全库匹配（用户可能输入冷门动作名），不限定 popular
        return exerciseMapper.findVisibleToUser(userId, false);
    }

    public MatchResult match(String rawName, List<Exercise> candidates) {
        if (rawName == null || rawName.isBlank()) return null;
        String q = normalize(rawName);

        // 1) 精确匹配（用户自定义优先于系统预设）
        Exercise exact = null;
        for (Exercise e : candidates) {
            if (normalize(e.getName()).equals(q)) {
                if (Boolean.TRUE.equals(e.getIsCustom())) return new MatchResult(e.getId(), 1.0, false);
                if (exact == null) exact = e;
            }
        }
        if (exact != null) return new MatchResult(exact.getId(), 1.0, false);

        // 2) 子串匹配
        List<Exercise> contains = new ArrayList<>();
        for (Exercise e : candidates) {
            String n = normalize(e.getName());
            if (n.contains(q) || q.contains(n)) contains.add(e);
        }
        if (!contains.isEmpty()) {
            // 选名字最短的（最接近通用名），用户自定义优先
            Exercise best = contains.stream()
                    .min((a, b) -> {
                        int aCustom = Boolean.TRUE.equals(a.getIsCustom()) ? 0 : 1;
                        int bCustom = Boolean.TRUE.equals(b.getIsCustom()) ? 0 : 1;
                        if (aCustom != bCustom) return Integer.compare(aCustom, bCustom);
                        return Integer.compare(a.getName().length(), b.getName().length());
                    }).orElse(contains.get(0));
            // 如果"最短"候选都比查询长很多（如 "仰卧抬腿" vs "平板卧推凳仰卧抬腿"），
            // 说明这是一个具体变种、不是用户想要的通用名 → 降置信度让 LLM 兜底或自动新建
            double ratio = (double) normalize(best.getName()).length() / Math.max(1, q.length());
            double conf = ratio > 1.8 ? 0.5 : (contains.size() == 1 ? 0.85 : 0.75);
            return new MatchResult(best.getId(), conf, contains.size() > 2);
        }

        // 3) 字符级相似度（适用于"俯卧撑" 对 "击掌俯卧撑" 这类小重叠）
        Map<Long, Double> scores = new HashMap<>();
        for (Exercise e : candidates) {
            double s = charOverlap(q, normalize(e.getName()));
            if (s >= 0.5) scores.put(e.getId(), s);
        }
        if (!scores.isEmpty()) {
            Long bestId = scores.entrySet().stream()
                    .max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse(null);
            double best = scores.get(bestId);
            return new MatchResult(bestId, Math.min(0.7, best), false);
        }

        return null;
    }

    private static String normalize(String s) {
        if (s == null) return "";
        return s.toLowerCase(Locale.ROOT)
                .replaceAll("[\\s\\-_/（）()\\[\\]【】]+", "");
    }

    /** 简单字符重叠率（Jaccard on Chars） */
    private static double charOverlap(String a, String b) {
        if (a.isEmpty() || b.isEmpty()) return 0;
        java.util.Set<Character> sa = new java.util.HashSet<>();
        java.util.Set<Character> sb = new java.util.HashSet<>();
        for (char c : a.toCharArray()) sa.add(c);
        for (char c : b.toCharArray()) sb.add(c);
        java.util.Set<Character> inter = new java.util.HashSet<>(sa);
        inter.retainAll(sb);
        java.util.Set<Character> uni = new java.util.HashSet<>(sa);
        uni.addAll(sb);
        return (double) inter.size() / uni.size();
    }
}
