package com.calorielog.module.training.quicklog.parser;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 把用户的中文/英文补录文本解析成结构化条目。
 * 容错优先 —— 解析不出来的片段保留 snippet，交给后续 LLM 兜底。
 */
@Component
public class QuickLogParser {

    private static final Map<String, Integer> CN_NUM = new LinkedHashMap<>();
    static {
        CN_NUM.put("零", 0); CN_NUM.put("一", 1); CN_NUM.put("两", 2); CN_NUM.put("二", 2);
        CN_NUM.put("三", 3); CN_NUM.put("四", 4); CN_NUM.put("五", 5); CN_NUM.put("六", 6);
        CN_NUM.put("七", 7); CN_NUM.put("八", 8); CN_NUM.put("九", 9); CN_NUM.put("十", 10);
        CN_NUM.put("十一", 11); CN_NUM.put("十二", 12); CN_NUM.put("十三", 13);
        CN_NUM.put("十四", 14); CN_NUM.put("十五", 15); CN_NUM.put("十六", 16);
        CN_NUM.put("十七", 17); CN_NUM.put("十八", 18); CN_NUM.put("十九", 19);
        CN_NUM.put("二十", 20); CN_NUM.put("三十", 30); CN_NUM.put("四十", 40); CN_NUM.put("五十", 50);
    }

    // 句子分割符
    private static final Pattern SENT_SPLIT = Pattern.compile("[，,；;。、\\n\\r+]|\\s+和\\s+|\\s+然后\\s+|\\s+接着\\s+|\\s+再\\s+|\\s+还\\s+");

    // 组数：N组 / N 组 / N×M(组×次)
    private static final Pattern P_SETS = Pattern.compile("([零一二两三四五六七八九十百\\d]{1,3})\\s*组");
    // 次数：每组N个/次 或者 N个/次/下 (单独出现时按总次数)
    private static final Pattern P_REPS_PER_SET = Pattern.compile("每\\s*组\\s*([零一二两三四五六七八九十百\\d]{1,4})\\s*[个次下]");
    private static final Pattern P_REPS_BARE = Pattern.compile("([零一二两三四五六七八九十百\\d]{1,4})\\s*[个次下]");
    // "N×M" "NxM" 模式（5x10 = 5组10次）
    private static final Pattern P_SETS_X_REPS = Pattern.compile("(\\d{1,3})\\s*[x×Xﾗ]\\s*(\\d{1,4})");
    // 重量：N kg / N 公斤 / N 斤 / Nkg
    private static final Pattern P_WEIGHT = Pattern.compile("([0-9]+(?:\\.[0-9]+)?)\\s*(kg|KG|公斤|千克|斤)");

    // 时间表达
    private static final Pattern P_DAYS_AGO = Pattern.compile("([零一二两三四五六七八九十\\d]{1,3})\\s*天前");
    private static final Pattern P_DATE_MD = Pattern.compile("(\\d{1,2})\\s*月\\s*(\\d{1,2})\\s*[日号]");
    private static final Pattern P_WEEKDAY = Pattern.compile("(上|本|这)?(?:周|星期)([一二三四五六日天])");

    public ParseResult parse(String text, LocalDateTime now) {
        if (text == null) text = "";
        if (now == null) now = LocalDateTime.now();

        // 1) 时间
        LocalDateTime occurredAt = parseTime(text, now);

        // 2) 去掉时间表达，剩下的当作动作描述
        String body = stripTimeExpressions(text);

        // 3) 切句 + 把延续片段合并到前一段
        String[] rawSegments = SENT_SPLIT.split(body);
        List<String> segments = mergeContinuations(rawSegments);
        List<ParsedEntry> entries = new ArrayList<>();
        for (String seg : segments) {
            ParsedEntry e = parseSegment(seg);
            if (e != null) entries.add(e);
        }

        return new ParseResult(entries, occurredAt, body);
    }

    private static final Pattern P_CONTINUATION = Pattern.compile(
            "^\\s*(每\\s*组|[零一二两三四五六七八九十百\\d]+\\s*[个次下]|\\d+\\s*[xX×ﾗ]\\s*\\d+|[0-9.]+\\s*(kg|公斤|斤))");

    /** 把仅包含「每组N个」「Nkg」等延续信息的片段合并到前一段，避免把「三组俯卧撑，每组10个」拆散 */
    private List<String> mergeContinuations(String[] segs) {
        List<String> out = new ArrayList<>();
        for (String raw : segs) {
            String s = raw == null ? "" : raw.trim();
            if (s.isEmpty()) continue;
            if (!out.isEmpty() && P_CONTINUATION.matcher(s).find()) {
                // 看起来是上一段的延续：合并
                out.set(out.size() - 1, out.get(out.size() - 1) + " " + s);
            } else {
                out.add(s);
            }
        }
        return out;
    }

    private LocalDateTime parseTime(String text, LocalDateTime now) {
        if (text.contains("前天")) return now.minusDays(2).withHour(20).withMinute(0).withSecond(0).withNano(0);
        if (text.contains("昨晚") || text.contains("昨天") || text.contains("昨日")) {
            return now.minusDays(1).withHour(20).withMinute(0).withSecond(0).withNano(0);
        }
        Matcher m = P_DAYS_AGO.matcher(text);
        if (m.find()) {
            Integer d = parseNumber(m.group(1));
            if (d != null && d > 0 && d < 366) {
                return now.minusDays(d).withHour(20).withMinute(0).withSecond(0).withNano(0);
            }
        }
        m = P_DATE_MD.matcher(text);
        if (m.find()) {
            int month = Integer.parseInt(m.group(1));
            int day = Integer.parseInt(m.group(2));
            try {
                LocalDate ld = LocalDate.of(now.getYear(), month, day);
                if (ld.isAfter(now.toLocalDate())) ld = ld.minusYears(1);
                return ld.atTime(20, 0);
            } catch (Exception ignore) {}
        }
        m = P_WEEKDAY.matcher(text);
        if (m.find()) {
            DayOfWeek dow = parseWeekday(m.group(2));
            if (dow != null) {
                LocalDate today = now.toLocalDate();
                int diff = today.getDayOfWeek().getValue() - dow.getValue();
                if (diff < 0) diff += 7;
                LocalDate target = today.minusDays(diff);
                if ("上".equals(m.group(1))) target = target.minusDays(7);
                return target.atTime(20, 0);
            }
        }
        // "今天/今日/今晚" 或未指明 → now
        return now;
    }

    private DayOfWeek parseWeekday(String ch) {
        return switch (ch) {
            case "一" -> DayOfWeek.MONDAY;
            case "二" -> DayOfWeek.TUESDAY;
            case "三" -> DayOfWeek.WEDNESDAY;
            case "四" -> DayOfWeek.THURSDAY;
            case "五" -> DayOfWeek.FRIDAY;
            case "六" -> DayOfWeek.SATURDAY;
            case "日", "天" -> DayOfWeek.SUNDAY;
            default -> null;
        };
    }

    private String stripTimeExpressions(String text) {
        return text
                .replaceAll("(今天|今日|今晚|今早|今中午)", " ")
                .replaceAll("(昨天|昨日|昨晚|昨早)", " ")
                .replaceAll("前天", " ")
                .replaceAll("([零一二两三四五六七八九十\\d]{1,3})\\s*天前", " ")
                .replaceAll("(\\d{1,2})\\s*月\\s*(\\d{1,2})\\s*[日号]", " ")
                .replaceAll("(上|本|这)?(?:周|星期)[一二三四五六日天]", " ")
                // N点 / N点钟 / N点半 / N点M分（含中文数字）
                .replaceAll("([零一二两三四五六七八九十廿\\d]{1,3})\\s*点(?:钟|半)?(?:\\s*([零一二两三四五六七八九十\\d]{1,2})\\s*分)?", " ")
                // 时段词
                .replaceAll("(上午|下午|傍晚|晚上|早上|中午|凌晨|清晨|半夜|深夜)", " ")
                // 动词
                .replaceAll("(做了|做完|练了|练完|完成了|完成|刚刚|刚才|刚做|搞了)", " ")
                // 主语（避免「我 / 你 / 咱」混进动作名）
                .replaceAll("(我|您|你|他|她|咱们?|大家|自己)", " ");
    }

    private ParsedEntry parseSegment(String seg) {
        if (seg.length() < 2) return null;

        ParsedEntry e = new ParsedEntry();
        e.setSnippet(seg);

        String remaining = seg;

        // 重量
        Matcher mw = P_WEIGHT.matcher(remaining);
        if (mw.find()) {
            try {
                BigDecimal w = new BigDecimal(mw.group(1));
                if ("斤".equals(mw.group(2))) w = w.divide(BigDecimal.valueOf(2));
                e.setWeight(w);
            } catch (Exception ignore) {}
            remaining = mw.replaceAll(" ");
        }

        // 优先 "N×M" 紧凑写法
        Matcher mxm = P_SETS_X_REPS.matcher(remaining);
        if (mxm.find() && e.getSets() == null && e.getReps() == null) {
            try {
                e.setSets(Integer.parseInt(mxm.group(1)));
                e.setReps(Integer.parseInt(mxm.group(2)));
            } catch (Exception ignore) {}
            remaining = mxm.replaceAll(" ");
        }

        // N 组
        Matcher ms = P_SETS.matcher(remaining);
        if (ms.find() && e.getSets() == null) {
            Integer n = parseNumber(ms.group(1));
            if (n != null) e.setSets(n);
            remaining = ms.replaceAll(" ");
        }

        // 每组 N 个 / 次
        Matcher mr = P_REPS_PER_SET.matcher(remaining);
        if (mr.find() && e.getReps() == null) {
            Integer n = parseNumber(mr.group(1));
            if (n != null) e.setReps(n);
            remaining = mr.replaceAll(" ");
        }

        // 单独 N 个 / 次 / 下
        if (e.getReps() == null) {
            Matcher mb = P_REPS_BARE.matcher(remaining);
            if (mb.find()) {
                Integer n = parseNumber(mb.group(1));
                if (n != null) {
                    e.setReps(n);
                    if (e.getSets() == null) e.setSets(1);
                }
                remaining = mb.replaceAll(" ");
            }
        }

        // 默认值
        if (e.getSets() == null) e.setSets(1);
        if (e.getReps() == null) e.setReps(0);  // 0 表示未知

        // 剩下的非空白部分当作动作名
        String name = remaining.replaceAll("[\\s,，;；。、:：\\-]+", " ").trim();
        // 去掉量词残留
        name = name.replaceAll("(每组|组|个|次|下|kg|公斤|斤|千克|做了|练了|完成|搞|来|的)", " ").trim();
        name = name.replaceAll("\\s+", "");
        if (name.isEmpty()) return null;
        e.setRawName(name);
        return e;
    }

    /** "一/二/...或十/二十/数字" → int */
    private Integer parseNumber(String token) {
        if (token == null) return null;
        token = token.trim();
        if (token.isEmpty()) return null;
        try { return Integer.parseInt(token); } catch (NumberFormatException ignore) {}
        if (CN_NUM.containsKey(token)) return CN_NUM.get(token);
        // 复合中文数字 e.g. 三十五
        if (token.length() == 2 && token.startsWith("十")) {
            Integer ones = CN_NUM.get(token.substring(1));
            if (ones != null) return 10 + ones;
        }
        if (token.length() == 3 && token.charAt(1) == '十') {
            Integer tens = CN_NUM.get(token.substring(0, 1));
            Integer ones = CN_NUM.get(token.substring(2));
            if (tens != null && ones != null) return tens * 10 + ones;
        }
        return null;
    }

    /** 解析结果包装 */
    public static class ParseResult {
        public final List<ParsedEntry> entries;
        public final LocalDateTime occurredAt;
        public final String cleanedText;
        public ParseResult(List<ParsedEntry> e, LocalDateTime t, String c) {
            this.entries = e; this.occurredAt = t; this.cleanedText = c;
        }
    }
}
