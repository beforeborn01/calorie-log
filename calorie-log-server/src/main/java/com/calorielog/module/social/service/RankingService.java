package com.calorielog.module.social.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.module.record.entity.DailySummary;
import com.calorielog.module.record.mapper.DailySummaryMapper;
import com.calorielog.module.social.dto.RankingEntryResponse;
import com.calorielog.module.social.dto.RankingResponse;
import com.calorielog.module.social.mapper.FriendshipMapper;
import com.calorielog.module.user.entity.User;
import com.calorielog.module.user.entity.UserExperience;
import com.calorielog.module.user.mapper.UserExperienceMapper;
import com.calorielog.module.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class RankingService {

    public static final String TYPE_EXP = "exp";
    public static final String TYPE_SCORE = "score";
    public static final String TYPE_STREAK = "streak";

    public static final String PERIOD_ALL = "all";
    public static final String PERIOD_WEEK = "week";
    public static final String PERIOD_MONTH = "month";

    private static final DateTimeFormatter WEEK_FMT = DateTimeFormatter.ofPattern("YYYY'W'ww");
    private static final DateTimeFormatter MONTH_FMT = DateTimeFormatter.ofPattern("yyyyMM");

    private final StringRedisTemplate redis;
    private final UserExperienceMapper experienceMapper;
    private final UserMapper userMapper;
    private final FriendshipMapper friendshipMapper;
    private final DailySummaryMapper dailySummaryMapper;

    public void onExpChange(Long userId) {
        UserExperience exp = experienceMapper.selectOne(
                new QueryWrapper<UserExperience>().eq("user_id", userId));
        if (exp == null) return;
        long totalExp = exp.getTotalExp() == null ? 0L : exp.getTotalExp();
        int streak = exp.getContinuousDays() == null ? 0 : exp.getContinuousDays();
        String member = String.valueOf(userId);
        redis.opsForZSet().add(keyAllExp(), member, totalExp);
        redis.opsForZSet().add(keyAllStreak(), member, streak);
    }

    public void onDailyScore(Long userId, LocalDate date, BigDecimal score) {
        if (score == null) return;
        String member = String.valueOf(userId);
        // 周榜 / 月榜均记录 sum，用于平均分；实际取时用 sum / days
        redis.opsForZSet().incrementScore(keyWeekScoreSum(date), member, score.doubleValue());
        redis.opsForZSet().incrementScore(keyWeekScoreDays(date), member, 1);
        redis.opsForZSet().incrementScore(keyMonthScoreSum(date), member, score.doubleValue());
        redis.opsForZSet().incrementScore(keyMonthScoreDays(date), member, 1);
    }

    public RankingResponse query(Long userId, String type, String period) {
        if (!Set.of(TYPE_EXP, TYPE_SCORE, TYPE_STREAK).contains(type)) {
            throw new BizException(ErrorCode.PARAM_INVALID, "不支持的榜单类型");
        }
        if (!Set.of(PERIOD_ALL, PERIOD_WEEK, PERIOD_MONTH).contains(period)) {
            throw new BizException(ErrorCode.PARAM_INVALID, "不支持的周期");
        }

        List<Long> candidateIds = new ArrayList<>();
        candidateIds.add(userId);
        candidateIds.addAll(friendshipMapper.listFriendIds(userId));

        Map<Long, Long> scoreMap = loadScores(type, period, candidateIds);

        List<RankingEntryResponse> entries = new ArrayList<>();
        List<Long> sorted = new ArrayList<>(candidateIds);
        sorted.sort((a, b) -> Long.compare(scoreMap.getOrDefault(b, 0L),
                scoreMap.getOrDefault(a, 0L)));

        Map<Long, User> userMap = loadUsers(sorted);
        Map<Long, UserExperience> expMap = loadExperiences(sorted);

        int rank = 1;
        for (Long uid : sorted) {
            RankingEntryResponse e = new RankingEntryResponse();
            e.setRank(rank++);
            e.setUserId(uid);
            User u = userMap.get(uid);
            e.setNickname(u == null || u.getNickname() == null ? "用户" + uid : u.getNickname());
            UserExperience ue = expMap.get(uid);
            e.setLevel(ue == null || ue.getLevel() == null ? 1 : ue.getLevel());
            e.setScore(scoreMap.getOrDefault(uid, 0L));
            e.setIsSelf(uid.equals(userId));
            entries.add(e);
        }

        RankingResponse resp = new RankingResponse();
        resp.setType(type);
        resp.setPeriod(period);
        resp.setEntries(entries);

        RankingEntryResponse self = entries.stream()
                .filter(e -> Boolean.TRUE.equals(e.getIsSelf())).findFirst().orElse(null);
        resp.setSelf(self);
        if (self != null && self.getRank() > 1) {
            RankingEntryResponse prev = entries.get(self.getRank() - 2);
            resp.setGapToPrevious(prev.getScore() - self.getScore());
        } else {
            resp.setGapToPrevious(0L);
        }
        return resp;
    }

    /**
     * 在新加好友时，把对方 exp / streak 预热到 Redis（初次加好友时对方可能还没被写过）。
     */
    public void primeUser(Long userId) {
        onExpChange(userId);
    }

    private Map<Long, Long> loadScores(String type, String period, List<Long> userIds) {
        Map<Long, Long> m = new HashMap<>();
        switch (type) {
            case TYPE_EXP -> {
                for (Long uid : userIds) {
                    UserExperience e = experienceMapper.selectOne(
                            new QueryWrapper<UserExperience>().eq("user_id", uid));
                    m.put(uid, e == null || e.getTotalExp() == null ? 0L : e.getTotalExp());
                }
            }
            case TYPE_STREAK -> {
                for (Long uid : userIds) {
                    UserExperience e = experienceMapper.selectOne(
                            new QueryWrapper<UserExperience>().eq("user_id", uid));
                    m.put(uid, e == null || e.getContinuousDays() == null ? 0L : e.getContinuousDays().longValue());
                }
            }
            case TYPE_SCORE -> fillScoreAvg(period, userIds, m);
        }
        return m;
    }

    private void fillScoreAvg(String period, List<Long> userIds, Map<Long, Long> out) {
        LocalDate today = LocalDate.now();
        LocalDate from;
        LocalDate to;
        switch (period) {
            case PERIOD_WEEK -> {
                from = today.with(DayOfWeek.MONDAY);
                to = from.plusDays(6);
            }
            case PERIOD_MONTH -> {
                YearMonth ym = YearMonth.from(today);
                from = ym.atDay(1);
                to = ym.atEndOfMonth();
            }
            default -> {
                from = today.minusDays(29);
                to = today;
            }
        }
        for (Long uid : userIds) {
            List<DailySummary> list = dailySummaryMapper.findInRange(uid, from, to);
            BigDecimal sum = BigDecimal.ZERO;
            int count = 0;
            for (DailySummary s : list) {
                if (s.getDietScore() != null && s.getDietScore().signum() > 0) {
                    sum = sum.add(s.getDietScore());
                    count++;
                }
            }
            long avg = count == 0 ? 0 : sum.divide(BigDecimal.valueOf(count), 0, RoundingMode.HALF_UP).longValueExact();
            out.put(uid, avg);
        }
    }

    private Map<Long, User> loadUsers(List<Long> ids) {
        Map<Long, User> m = new HashMap<>();
        if (ids.isEmpty()) return m;
        for (User u : userMapper.selectBatchIds(ids)) m.put(u.getId(), u);
        return m;
    }

    private Map<Long, UserExperience> loadExperiences(List<Long> ids) {
        Map<Long, UserExperience> m = new HashMap<>();
        for (Long id : ids) {
            UserExperience e = experienceMapper.selectOne(
                    new QueryWrapper<UserExperience>().eq("user_id", id));
            if (e != null) m.put(id, e);
        }
        return m;
    }

    private static String keyAllExp() {
        return "ranking:exp:all";
    }

    private static String keyAllStreak() {
        return "ranking:streak:all";
    }

    private static String keyWeekScoreSum(LocalDate d) {
        return "ranking:score:week:" + d.format(WEEK_FMT) + ":sum";
    }

    private static String keyWeekScoreDays(LocalDate d) {
        return "ranking:score:week:" + d.format(WEEK_FMT) + ":days";
    }

    private static String keyMonthScoreSum(LocalDate d) {
        return "ranking:score:month:" + d.format(MONTH_FMT) + ":sum";
    }

    private static String keyMonthScoreDays(LocalDate d) {
        return "ranking:score:month:" + d.format(MONTH_FMT) + ":days";
    }
}
