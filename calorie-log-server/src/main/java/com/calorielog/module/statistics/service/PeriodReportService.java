package com.calorielog.module.statistics.service;

import com.calorielog.module.body.entity.BodyRecord;
import com.calorielog.module.body.mapper.BodyRecordMapper;
import com.calorielog.module.record.entity.DailySummary;
import com.calorielog.module.record.mapper.DailySummaryMapper;
import com.calorielog.module.statistics.dto.PeriodReportResponse;
import com.calorielog.module.strength.mapper.StrengthRecordMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PeriodReportService {

    private final DailySummaryMapper summaryMapper;
    private final BodyRecordMapper bodyRecordMapper;
    private final StrengthRecordMapper strengthRecordMapper;

    public PeriodReportResponse weekly(Long userId, LocalDate startDate) {
        LocalDate endDate = startDate.plusDays(6);
        return build(userId, "weekly", startDate, endDate, false);
    }

    public PeriodReportResponse monthly(Long userId, YearMonth yearMonth) {
        LocalDate from = yearMonth.atDay(1);
        LocalDate to = yearMonth.atEndOfMonth();
        return build(userId, "monthly", from, to, true);
    }

    private PeriodReportResponse build(Long userId, String period, LocalDate from, LocalDate to,
                                       boolean withConclusion) {
        List<DailySummary> summaries = summaryMapper.findInRange(userId, from, to);
        List<BodyRecord> bodies = bodyRecordMapper.findInRange(userId, from, to);
        Map<LocalDate, BodyRecord> bodyByDate = new HashMap<>();
        for (BodyRecord b : bodies) bodyByDate.put(b.getRecordDate(), b);

        PeriodReportResponse resp = new PeriodReportResponse();
        resp.setPeriod(period);
        resp.setStartDate(from);
        resp.setEndDate(to);

        // 饮食均值
        int days = 0;
        BigDecimal sumCal = BigDecimal.ZERO, sumPro = BigDecimal.ZERO, sumCarb = BigDecimal.ZERO,
                sumFat = BigDecimal.ZERO, sumFiber = BigDecimal.ZERO, sumGap = BigDecimal.ZERO,
                sumScore = BigDecimal.ZERO;
        int gapCount = 0, scoreCount = 0;
        DailySummary best = null, worst = null;
        for (DailySummary s : summaries) {
            if (s.getTotalCalories() != null && s.getTotalCalories().signum() > 0) {
                days++;
                sumCal = sumCal.add(nz(s.getTotalCalories()));
                sumPro = sumPro.add(nz(s.getTotalProtein()));
                sumCarb = sumCarb.add(nz(s.getTotalCarb()));
                sumFat = sumFat.add(nz(s.getTotalFat()));
                sumFiber = sumFiber.add(nz(s.getTotalFiber()));
            }
            if (s.getCalorieGap() != null) {
                sumGap = sumGap.add(s.getCalorieGap());
                gapCount++;
            }
            if (s.getDietScore() != null) {
                sumScore = sumScore.add(s.getDietScore());
                scoreCount++;
                if (best == null || s.getDietScore().compareTo(best.getDietScore()) > 0) best = s;
                if (worst == null || s.getDietScore().compareTo(worst.getDietScore()) < 0) worst = s;
            }
        }
        resp.setDaysWithRecords(days);
        if (days > 0) {
            BigDecimal d = BigDecimal.valueOf(days);
            resp.setAvgCalories(divide(sumCal, d));
            resp.setAvgProtein(divide(sumPro, d));
            resp.setAvgCarb(divide(sumCarb, d));
            resp.setAvgFat(divide(sumFat, d));
            resp.setAvgFiber(divide(sumFiber, d));
        }
        if (gapCount > 0) resp.setAvgCalorieGap(divide(sumGap, BigDecimal.valueOf(gapCount)));
        if (scoreCount > 0) resp.setAvgDietScore(divide(sumScore, BigDecimal.valueOf(scoreCount)));
        if (best != null) {
            resp.setBestDate(best.getSummaryDate());
            resp.setBestDietScore(best.getDietScore());
        }
        if (worst != null) {
            resp.setWorstDate(worst.getSummaryDate());
            resp.setWorstDietScore(worst.getDietScore());
        }

        // 体重体脂
        if (!bodies.isEmpty()) {
            bodies.sort(Comparator.comparing(BodyRecord::getRecordDate));
            BodyRecord first = bodies.get(0);
            BodyRecord last = bodies.get(bodies.size() - 1);
            resp.setWeightStart(first.getWeight());
            resp.setWeightEnd(last.getWeight());
            resp.setWeightChange(diff(last.getWeight(), first.getWeight()));
            resp.setBodyFatStart(first.getBodyFat());
            resp.setBodyFatEnd(last.getBodyFat());
            resp.setBodyFatChange(diff(last.getBodyFat(), first.getBodyFat()));
        }

        // 力量训练
        resp.setStrengthTrainingDays(strengthRecordMapper.countTrainingDays(userId, from, to));
        Map<String, Object> vol = strengthRecordMapper.aggregateVolume(userId, from, to);
        resp.setStrengthTotalSets(asInt(vol.get("total_sets")));
        resp.setStrengthTotalReps(asLong(vol.get("total_reps")));
        resp.setStrengthTotalVolume(asDecimal(vol.get("total_volume")));

        // 日明细
        List<PeriodReportResponse.DayPoint> points = new ArrayList<>();
        Map<LocalDate, DailySummary> summaryByDate = new HashMap<>();
        for (DailySummary s : summaries) summaryByDate.put(s.getSummaryDate(), s);
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            PeriodReportResponse.DayPoint p = new PeriodReportResponse.DayPoint();
            p.setDate(d);
            DailySummary s = summaryByDate.get(d);
            if (s != null) {
                p.setCalories(s.getTotalCalories());
                p.setCalorieGap(s.getCalorieGap());
                p.setDietScore(s.getDietScore());
            }
            BodyRecord b = bodyByDate.get(d);
            if (b != null) {
                p.setWeight(b.getWeight());
                p.setBodyFat(b.getBodyFat());
            }
            points.add(p);
        }
        resp.setDailyPoints(points);

        if (withConclusion) resp.setConclusion(buildConclusion(resp));
        return resp;
    }

    private String buildConclusion(PeriodReportResponse r) {
        StringBuilder sb = new StringBuilder();
        if (r.getDaysWithRecords() != null && r.getDaysWithRecords() > 0) {
            sb.append("本月记录 ").append(r.getDaysWithRecords()).append(" 天饮食");
            if (r.getAvgCalories() != null) {
                sb.append("，日均摄入 ").append(r.getAvgCalories().setScale(0, RoundingMode.HALF_UP)).append(" kcal");
            }
            if (r.getAvgCalorieGap() != null) {
                BigDecimal g = r.getAvgCalorieGap();
                sb.append(g.signum() >= 0 ? "，日均盈余 " : "，日均缺口 ")
                        .append(g.abs().setScale(0, RoundingMode.HALF_UP)).append(" kcal");
            }
            sb.append("。");
        }
        if (r.getWeightChange() != null) {
            sb.append("体重变化 ").append(r.getWeightChange().setScale(1, RoundingMode.HALF_UP)).append(" kg");
            if (r.getBodyFatChange() != null) {
                sb.append("，体脂率变化 ").append(r.getBodyFatChange().setScale(1, RoundingMode.HALF_UP)).append("%");
            }
            sb.append("。");
        }
        if (r.getStrengthTrainingDays() != null && r.getStrengthTrainingDays() > 0) {
            sb.append("力量训练 ").append(r.getStrengthTrainingDays()).append(" 天");
            if (r.getStrengthTotalVolume() != null && r.getStrengthTotalVolume().signum() > 0) {
                sb.append("，累计容量 ").append(r.getStrengthTotalVolume().setScale(0, RoundingMode.HALF_UP)).append(" kg");
            }
            sb.append("。");
        }
        if (sb.length() == 0) sb.append("本月暂无可统计数据。");
        return sb.toString();
    }

    private static BigDecimal nz(BigDecimal b) { return b == null ? BigDecimal.ZERO : b; }
    private static BigDecimal divide(BigDecimal a, BigDecimal b) {
        return a.divide(b, 2, RoundingMode.HALF_UP);
    }
    private static BigDecimal diff(BigDecimal a, BigDecimal b) {
        if (a == null || b == null) return null;
        return a.subtract(b);
    }
    private static Integer asInt(Object v) {
        if (v == null) return 0;
        if (v instanceof Number n) return n.intValue();
        return Integer.parseInt(v.toString());
    }
    private static Long asLong(Object v) {
        if (v == null) return 0L;
        if (v instanceof Number n) return n.longValue();
        return Long.parseLong(v.toString());
    }
    private static BigDecimal asDecimal(Object v) {
        if (v == null) return BigDecimal.ZERO;
        if (v instanceof BigDecimal bd) return bd;
        if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return new BigDecimal(v.toString());
    }
}
