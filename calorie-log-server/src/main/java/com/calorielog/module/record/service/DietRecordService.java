package com.calorielog.module.record.service;

import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.common.utils.NutritionCalculator;
import com.calorielog.module.food.entity.Food;
import com.calorielog.module.food.mapper.FoodMapper;
import com.calorielog.module.record.dto.CreateRecordRequest;
import com.calorielog.module.record.dto.DailyRecordsResponse;
import com.calorielog.module.record.dto.DietRecordResponse;
import com.calorielog.module.record.dto.UpdateRecordRequest;
import com.calorielog.module.record.entity.DietRecord;
import com.calorielog.module.record.mapper.DietRecordMapper;
import com.calorielog.module.statistics.service.DietScoreService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DietRecordService {

    private final DietRecordMapper recordMapper;
    private final FoodMapper foodMapper;
    private final GrossNetWeightService grossNetWeightService;
    private final DailySummaryService summaryService;
    private final DietScoreService dietScoreService;

    @Transactional
    public DietRecordResponse create(Long userId, CreateRecordRequest req) {
        DietRecord record = new DietRecord();
        record.setUserId(userId);
        record.setRecordDate(req.getRecordDate());
        record.setMealType(req.getMealType());
        record.setAddMethod(req.getAddMethod() != null ? req.getAddMethod() : 1);

        if (req.getFoodId() != null) {
            Food food = foodMapper.selectById(req.getFoodId());
            if (food == null) throw new BizException(ErrorCode.FOOD_NOT_FOUND);
            if ("user".equals(food.getDataSource())
                    && (food.getCreatedBy() == null || !food.getCreatedBy().equals(userId))) {
                throw new BizException(ErrorCode.FOOD_NO_PERMISSION);
            }
            BigDecimal net = req.getQuantity();
            if (net == null && req.getGrossQuantity() != null) {
                net = grossNetWeightService.toNetWeight(req.getGrossQuantity(), food);
            }
            if (net == null) throw new BizException(ErrorCode.PARAM_INVALID, "需要传入 quantity 或 grossQuantity");
            record.setQuantity(net);
            record.setGrossQuantity(req.getGrossQuantity());
            record.setFoodId(food.getId());
            record.setFoodName(food.getName());

            NutritionCalculator.ScaledNutrition s = NutritionCalculator.scale(food, net);
            record.setCalories(s.calories != null ? s.calories : BigDecimal.ZERO);
            record.setProtein(s.protein);
            record.setCarbohydrate(s.carbohydrate);
            record.setFat(s.fat);
            record.setDietaryFiber(s.dietaryFiber);
            record.setAddedSugar(s.addedSugar);
        } else {
            // 手动录入
            if (req.getFoodName() == null || req.getFoodName().isBlank()) {
                throw new BizException(ErrorCode.PARAM_INVALID, "手动录入需要 foodName");
            }
            if (req.getQuantity() == null) {
                throw new BizException(ErrorCode.PARAM_INVALID, "手动录入需要 quantity");
            }
            if (req.getCalories() == null) {
                throw new BizException(ErrorCode.PARAM_INVALID, "手动录入需要 calories");
            }
            record.setFoodName(req.getFoodName());
            record.setQuantity(req.getQuantity());
            record.setGrossQuantity(req.getGrossQuantity());
            record.setCalories(req.getCalories());
            record.setProtein(req.getProtein());
            record.setCarbohydrate(req.getCarbohydrate());
            record.setFat(req.getFat());
            record.setDietaryFiber(req.getDietaryFiber());
            record.setAddedSugar(req.getAddedSugar());
        }

        recordMapper.insert(record);
        summaryService.recompute(userId, req.getRecordDate());
        dietScoreService.recomputeAsync(userId, req.getRecordDate());
        return DietRecordResponse.of(record);
    }

    @Transactional
    public DietRecordResponse update(Long userId, Long id, UpdateRecordRequest req) {
        DietRecord existing = recordMapper.selectById(id);
        if (existing == null) throw new BizException(ErrorCode.RECORD_NOT_FOUND);
        if (!existing.getUserId().equals(userId)) {
            throw new BizException(ErrorCode.RECORD_NO_PERMISSION);
        }

        boolean quantityChanged = req.getQuantity() != null
                && (existing.getQuantity() == null || existing.getQuantity().compareTo(req.getQuantity()) != 0);

        if (req.getMealType() != null) existing.setMealType(req.getMealType());
        if (req.getFoodName() != null) existing.setFoodName(req.getFoodName());
        if (req.getQuantity() != null) existing.setQuantity(req.getQuantity());
        if (req.getGrossQuantity() != null) existing.setGrossQuantity(req.getGrossQuantity());

        // 若 quantity 变化且有 foodId，重新按食物库计算营养素
        if (quantityChanged && existing.getFoodId() != null) {
            Food food = foodMapper.selectById(existing.getFoodId());
            if (food != null) {
                NutritionCalculator.ScaledNutrition s = NutritionCalculator.scale(food, existing.getQuantity());
                existing.setCalories(s.calories != null ? s.calories : BigDecimal.ZERO);
                existing.setProtein(s.protein);
                existing.setCarbohydrate(s.carbohydrate);
                existing.setFat(s.fat);
                existing.setDietaryFiber(s.dietaryFiber);
                existing.setAddedSugar(s.addedSugar);
            }
        } else {
            // 手动录入允许覆盖营养值
            if (req.getCalories() != null) existing.setCalories(req.getCalories());
            if (req.getProtein() != null) existing.setProtein(req.getProtein());
            if (req.getCarbohydrate() != null) existing.setCarbohydrate(req.getCarbohydrate());
            if (req.getFat() != null) existing.setFat(req.getFat());
            if (req.getDietaryFiber() != null) existing.setDietaryFiber(req.getDietaryFiber());
            if (req.getAddedSugar() != null) existing.setAddedSugar(req.getAddedSugar());
        }

        recordMapper.updateById(existing);
        summaryService.recompute(userId, existing.getRecordDate());
        dietScoreService.recomputeAsync(userId, existing.getRecordDate());
        return DietRecordResponse.of(existing);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        DietRecord existing = recordMapper.selectById(id);
        if (existing == null) throw new BizException(ErrorCode.RECORD_NOT_FOUND);
        if (!existing.getUserId().equals(userId)) {
            throw new BizException(ErrorCode.RECORD_NO_PERMISSION);
        }
        recordMapper.deleteById(id);
        summaryService.recompute(userId, existing.getRecordDate());
        dietScoreService.recomputeAsync(userId, existing.getRecordDate());
    }

    public DailyRecordsResponse getDaily(Long userId, LocalDate date) {
        List<DietRecord> all = recordMapper.findByDate(userId, date);
        DailyRecordsResponse resp = new DailyRecordsResponse();
        resp.setDate(date);
        resp.setBreakfast(new ArrayList<>());
        resp.setLunch(new ArrayList<>());
        resp.setDinner(new ArrayList<>());
        resp.setSnacks(new ArrayList<>());

        BigDecimal cal = BigDecimal.ZERO, pro = BigDecimal.ZERO, carb = BigDecimal.ZERO,
                fat = BigDecimal.ZERO, fib = BigDecimal.ZERO;
        for (DietRecord r : all) {
            DietRecordResponse d = DietRecordResponse.of(r);
            switch (r.getMealType()) {
                case 1 -> resp.getBreakfast().add(d);
                case 2 -> resp.getLunch().add(d);
                case 3 -> resp.getDinner().add(d);
                default -> resp.getSnacks().add(d);
            }
            if (r.getCalories() != null) cal = cal.add(r.getCalories());
            if (r.getProtein() != null) pro = pro.add(r.getProtein());
            if (r.getCarbohydrate() != null) carb = carb.add(r.getCarbohydrate());
            if (r.getFat() != null) fat = fat.add(r.getFat());
            if (r.getDietaryFiber() != null) fib = fib.add(r.getDietaryFiber());
        }
        resp.setTotalCalories(cal);
        resp.setTotalProtein(pro);
        resp.setTotalCarb(carb);
        resp.setTotalFat(fat);
        resp.setTotalFiber(fib);
        resp.setTargetCalories(summaryService.resolveTargetCalories(userId, date));
        return resp;
    }
}
