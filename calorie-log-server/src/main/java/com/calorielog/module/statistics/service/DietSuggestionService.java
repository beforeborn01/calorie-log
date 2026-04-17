package com.calorielog.module.statistics.service;

import com.calorielog.module.goal.entity.UserGoal;
import com.calorielog.module.goal.service.GoalService;
import com.calorielog.module.record.entity.DailySummary;
import com.calorielog.module.record.entity.DietRecord;
import com.calorielog.module.record.mapper.DietRecordMapper;
import com.calorielog.module.record.service.DailySummaryService;
import com.calorielog.module.statistics.dto.DietSuggestionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DietSuggestionService {

    private final DailySummaryService dailySummaryService;
    private final DietRecordMapper dietRecordMapper;
    private final GoalService goalService;

    // 餐次推荐占比与打分同步
    private static final Map<Integer, Double> MEAL_TARGET_RATIO = Map.of(1, 0.25, 2, 0.35, 3, 0.30, 4, 0.10);

    // 营养素补充推荐食物
    private static final List<String> HIGH_PROTEIN_FOODS = List.of("鸡胸肉", "牛里脊", "鸡蛋白", "希腊酸奶", "豆腐", "三文鱼");
    private static final List<String> HIGH_FIBER_FOODS = List.of("西兰花", "菠菜", "糙米饭", "燕麦片", "苹果", "红薯");
    private static final List<String> HIGH_CARB_FOODS = List.of("燕麦片", "红薯", "糙米饭", "全麦面包", "香蕉");
    private static final List<String> HEALTHY_FAT_FOODS = List.of("橄榄油", "三文鱼", "核桃仁", "杏仁");
    private static final List<String> LOW_CAL_SNACKS = List.of("黄瓜", "番茄", "苹果", "无糖酸奶");

    public DietSuggestionResponse getSuggestions(Long userId, LocalDate date) {
        DailySummary s = dailySummaryService.getOrInit(userId, date);
        List<DietRecord> records = dietRecordMapper.findByDate(userId, date);
        UserGoal goal = goalService.findActiveOrNull(userId);

        List<DietSuggestionResponse.Suggestion> out = new ArrayList<>();
        addCalorieSuggestions(out, s, goal);
        addNutrientSuggestions(out, s, goal);
        addMealDistributionSuggestions(out, records, s);
        addVarietySuggestions(out, records);

        DietSuggestionResponse resp = new DietSuggestionResponse();
        resp.setDate(date);
        resp.setSuggestions(out);
        return resp;
    }

    private void addCalorieSuggestions(List<DietSuggestionResponse.Suggestion> out,
                                       DailySummary s, UserGoal goal) {
        if (s.getTargetCalories() == null || s.getCalorieGap() == null) return;
        double target = s.getTargetCalories().doubleValue();
        double gap = s.getCalorieGap().doubleValue();
        double absPct = Math.abs(gap) / target * 100.0;
        if (absPct <= 10) return;

        boolean surplus = gap > 0;
        String severity = absPct > 20 ? "critical" : "warn";
        DietSuggestionResponse.Suggestion g = new DietSuggestionResponse.Suggestion();
        g.setCategory("calorie");
        g.setSeverity(severity);
        String absStr = String.format("%.0f", Math.abs(gap));
        if (surplus) {
            g.setTitle("热量摄入超标");
            if (goal != null && goal.getGoalType() == 2) {
                g.setDetail("今日热量盈余 " + absStr + " kcal，与减脂目标冲突。建议减少高脂零食与含糖饮料。");
            } else {
                g.setDetail("今日热量盈余 " + absStr + " kcal。若是增肌期间可接受；若想维持体重，建议晚餐减量。");
            }
        } else {
            g.setTitle("热量摄入不足");
            if (goal != null && goal.getGoalType() == 1) {
                g.setDetail("今日热量缺口 " + absStr + " kcal，影响增肌效率。建议加餐补充主食或蛋白质。");
                g.setRecommendedFoods(HIGH_CARB_FOODS.subList(0, 3));
            } else {
                g.setDetail("今日热量缺口 " + absStr + " kcal，有助于减脂；但过大缺口（>20%）可能导致肌肉流失。");
            }
        }
        out.add(g);
    }

    private void addNutrientSuggestions(List<DietSuggestionResponse.Suggestion> out,
                                        DailySummary s, UserGoal goal) {
        if (goal == null || s.getTargetCalories() == null) return;
        double target = s.getTargetCalories().doubleValue();
        double proteinTargetG = target * goal.getProteinRatio().doubleValue() / 100.0 / 4.0;
        double carbTargetG = target * goal.getCarbRatio().doubleValue() / 100.0 / 4.0;
        double fatTargetG = target * goal.getFatRatio().doubleValue() / 100.0 / 9.0;

        double pro = num(s.getTotalProtein());
        double carb = num(s.getTotalCarb());
        double fat = num(s.getTotalFat());
        double fiber = num(s.getTotalFiber());

        if (pro < proteinTargetG * 0.8) {
            out.add(build("nutrient", "warn", "蛋白质摄入不足",
                    String.format("今日蛋白质 %.0fg，建议目标 %.0fg。", pro, proteinTargetG),
                    HIGH_PROTEIN_FOODS.subList(0, 4)));
        } else if (pro > proteinTargetG * 1.3) {
            out.add(build("nutrient", "info", "蛋白质摄入偏高",
                    String.format("今日蛋白质 %.0fg，超目标 %.0fg。肾功能正常时无妨，但建议适度。", pro, proteinTargetG), null));
        }
        if (carb < carbTargetG * 0.7) {
            out.add(build("nutrient", "warn", "碳水摄入偏低",
                    String.format("今日碳水 %.0fg，目标 %.0fg。训练后需要碳水补充糖原。", carb, carbTargetG),
                    HIGH_CARB_FOODS.subList(0, 3)));
        }
        if (fat > fatTargetG * 1.3) {
            out.add(build("nutrient", "warn", "脂肪摄入偏高",
                    String.format("今日脂肪 %.0fg，目标 %.0fg。建议替换为低脂烹饪方式。", fat, fatTargetG), null));
        } else if (fat < fatTargetG * 0.6) {
            out.add(build("nutrient", "info", "脂肪摄入偏低",
                    String.format("今日脂肪 %.0fg，目标 %.0fg。适度健康脂肪有助激素平衡。", fat, fatTargetG),
                    HEALTHY_FAT_FOODS.subList(0, 3)));
        }
        if (fiber < 25) {
            out.add(build("nutrient", "info", "膳食纤维不足",
                    String.format("今日膳食纤维 %.0fg，建议 ≥25g。", fiber),
                    HIGH_FIBER_FOODS.subList(0, 4)));
        }
    }

    private void addMealDistributionSuggestions(List<DietSuggestionResponse.Suggestion> out,
                                                List<DietRecord> records, DailySummary s) {
        if (records.isEmpty() || s.getTotalCalories() == null || s.getTotalCalories().signum() == 0) return;
        double total = s.getTotalCalories().doubleValue();
        Map<Integer, Double> byMeal = new HashMap<>();
        for (DietRecord r : records) {
            if (r.getMealType() == null) continue;
            byMeal.merge(r.getMealType(), r.getCalories() == null ? 0 : r.getCalories().doubleValue(), Double::sum);
        }
        for (Map.Entry<Integer, Double> entry : MEAL_TARGET_RATIO.entrySet()) {
            double actualRatio = byMeal.getOrDefault(entry.getKey(), 0.0) / total;
            double targetRatio = entry.getValue();
            double deviation = actualRatio - targetRatio;
            if (Math.abs(deviation) <= 0.08) continue;
            String mealName = mealLabel(entry.getKey());
            if (deviation > 0) {
                out.add(build("meal_distribution", "info", mealName + "热量占比偏高",
                        String.format("%s 占 %.0f%%，建议 %.0f%%。", mealName, actualRatio * 100, targetRatio * 100), null));
            } else if (byMeal.getOrDefault(entry.getKey(), 0.0) == 0 && entry.getKey() <= 3) {
                out.add(build("meal_distribution", "warn", "缺少" + mealName,
                        "未记录" + mealName + "。跳过正餐易导致下一餐暴食。", null));
            } else {
                out.add(build("meal_distribution", "info", mealName + "热量占比偏低",
                        String.format("%s 占 %.0f%%，建议 %.0f%%。", mealName, actualRatio * 100, targetRatio * 100), null));
            }
        }
    }

    private void addVarietySuggestions(List<DietSuggestionResponse.Suggestion> out, List<DietRecord> records) {
        long distinct = records.stream()
                .filter(r -> r.getFoodName() != null)
                .map(r -> r.getFoodId() != null ? String.valueOf(r.getFoodId()) : r.getFoodName())
                .distinct()
                .count();
        if (distinct >= 8) return;
        String severity = distinct < 5 ? "warn" : "info";
        out.add(build("variety", severity, "食物种类偏少",
                String.format("今日仅 %d 种食物，建议 ≥12 种以覆盖不同微量营养素。", distinct),
                List.of("蓝莓", "西兰花", "核桃仁", "鸡蛋", "三文鱼")));
    }

    private DietSuggestionResponse.Suggestion build(String category, String severity,
                                                    String title, String detail, List<String> foods) {
        DietSuggestionResponse.Suggestion s = new DietSuggestionResponse.Suggestion();
        s.setCategory(category);
        s.setSeverity(severity);
        s.setTitle(title);
        s.setDetail(detail);
        s.setRecommendedFoods(foods);
        return s;
    }

    private static double num(BigDecimal v) { return v == null ? 0 : v.doubleValue(); }

    private static String mealLabel(int type) {
        return switch (type) {
            case 1 -> "早餐";
            case 2 -> "午餐";
            case 3 -> "晚餐";
            default -> "加餐";
        };
    }
}
