package com.calorielog.module.export.service;

import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.module.export.util.CsvWriter;
import com.calorielog.module.record.entity.DietRecord;
import com.calorielog.module.record.mapper.DietRecordMapper;
import com.calorielog.module.social.dto.RankingEntryResponse;
import com.calorielog.module.social.dto.RankingResponse;
import com.calorielog.module.social.service.RankingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExportService {

    private static final int MAX_DAYS = 366; // 防止一次导出大数据

    private static final String[] MEALS = {"", "早餐", "午餐", "晚餐", "加餐"};

    private final DietRecordMapper dietRecordMapper;
    private final RankingService rankingService;

    public void exportRecords(Long userId, LocalDate from, LocalDate to, OutputStream out) throws IOException {
        if (from == null || to == null || to.isBefore(from)) {
            throw new BizException(ErrorCode.PARAM_INVALID, "startDate/endDate 必填且 end >= start");
        }
        long days = ChronoUnit.DAYS.between(from, to) + 1;
        if (days > MAX_DAYS) throw new BizException(ErrorCode.PARAM_INVALID, "导出区间不得超过 366 天");

        List<DietRecord> records = dietRecordMapper.findInRange(userId, from, to);
        List<String> headers = List.of(
                "日期", "餐次", "食物名称", "分量(g)", "热量(kcal)",
                "蛋白质(g)", "碳水(g)", "脂肪(g)", "膳食纤维(g)", "添加糖(g)");
        List<List<String>> rows = new ArrayList<>(records.size());
        for (DietRecord r : records) {
            rows.add(List.of(
                    r.getRecordDate().toString(),
                    mealLabel(r.getMealType()),
                    nullSafe(r.getFoodName()),
                    fmt(r.getQuantity()),
                    fmt(r.getCalories()),
                    fmt(r.getProtein()),
                    fmt(r.getCarbohydrate()),
                    fmt(r.getFat()),
                    fmt(r.getDietaryFiber()),
                    fmt(r.getAddedSugar())));
        }
        CsvWriter.write(out, headers, rows);
    }

    public void exportRanking(Long userId, String type, String period, OutputStream out) throws IOException {
        RankingResponse ranking = rankingService.query(userId, type, period);
        List<String> headers = List.of("排名", "用户", "等级", typeLabel(type));
        List<List<String>> rows = new ArrayList<>(ranking.getEntries().size());
        for (RankingEntryResponse e : ranking.getEntries()) {
            rows.add(List.of(
                    String.valueOf(e.getRank()),
                    nullSafe(e.getNickname()) + (Boolean.TRUE.equals(e.getIsSelf()) ? "（本人）" : ""),
                    "Lv" + e.getLevel(),
                    String.valueOf(e.getScore())));
        }
        CsvWriter.write(out, headers, rows);
    }

    private static String typeLabel(String type) {
        return switch (type) {
            case "exp" -> "经验值";
            case "score" -> "饮食评分";
            case "streak" -> "连续天数";
            default -> "分数";
        };
    }

    private static String mealLabel(Integer t) {
        if (t == null || t < 1 || t > 4) return "";
        return MEALS[t];
    }

    private static String fmt(BigDecimal v) {
        return v == null ? "" : v.toPlainString();
    }

    private static String nullSafe(String s) {
        return s == null ? "" : s;
    }
}
