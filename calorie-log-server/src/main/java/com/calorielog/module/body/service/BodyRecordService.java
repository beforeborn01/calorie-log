package com.calorielog.module.body.service;

import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.module.body.dto.BodyRecordResponse;
import com.calorielog.module.body.dto.BodyTrendResponse;
import com.calorielog.module.body.dto.SaveBodyRecordRequest;
import com.calorielog.module.body.entity.BodyRecord;
import com.calorielog.module.body.mapper.BodyRecordMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BodyRecordService {

    private final BodyRecordMapper bodyRecordMapper;

    @Transactional
    public BodyRecordResponse save(Long userId, SaveBodyRecordRequest req) {
        if (req.getWeight() == null && req.getBodyFat() == null) {
            throw new BizException(ErrorCode.BAD_REQUEST.getCode(), "体重或体脂率至少填一项");
        }
        BodyRecord existing = bodyRecordMapper.findByDate(userId, req.getRecordDate());
        BodyRecord r = existing == null ? new BodyRecord() : existing;
        r.setUserId(userId);
        r.setRecordDate(req.getRecordDate());
        if (req.getWeight() != null) r.setWeight(req.getWeight());
        if (req.getBodyFat() != null) r.setBodyFat(req.getBodyFat());
        if (existing == null) bodyRecordMapper.insert(r);
        else bodyRecordMapper.updateById(r);
        return toResponse(r);
    }

    public BodyTrendResponse getTrend(Long userId, LocalDate from, LocalDate to) {
        List<BodyRecord> records = bodyRecordMapper.findInRange(userId, from, to);
        BodyTrendResponse resp = new BodyTrendResponse();
        resp.setStartDate(from);
        resp.setEndDate(to);
        resp.setRecords(records.stream().map(this::toResponse).collect(Collectors.toList()));
        if (records.size() >= 2) {
            BodyRecord first = records.get(0);
            BodyRecord last = records.get(records.size() - 1);
            resp.setWeightChange(subtract(last.getWeight(), first.getWeight()));
            resp.setBodyFatChange(subtract(last.getBodyFat(), first.getBodyFat()));
        }
        return resp;
    }

    @Transactional
    public void delete(Long userId, Long id) {
        BodyRecord r = bodyRecordMapper.selectById(id);
        if (r == null) throw new BizException(ErrorCode.RECORD_NOT_FOUND);
        if (!r.getUserId().equals(userId)) throw new BizException(ErrorCode.RECORD_NO_PERMISSION);
        bodyRecordMapper.deleteById(id);
    }

    private BodyRecordResponse toResponse(BodyRecord r) {
        BodyRecordResponse resp = new BodyRecordResponse();
        BeanUtils.copyProperties(r, resp);
        return resp;
    }

    private static BigDecimal subtract(BigDecimal a, BigDecimal b) {
        if (a == null || b == null) return null;
        return a.subtract(b);
    }
}
