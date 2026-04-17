package com.calorielog.module.social.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.calorielog.common.exception.BizException;
import com.calorielog.common.exception.ErrorCode;
import com.calorielog.common.utils.IdentifierUtils;
import com.calorielog.module.record.mapper.DietRecordMapper;
import com.calorielog.module.social.dto.FriendRequestResponse;
import com.calorielog.module.social.dto.FriendResponse;
import com.calorielog.module.social.dto.FriendSearchResponse;
import com.calorielog.module.social.dto.HandleFriendRequestRequest;
import com.calorielog.module.social.dto.SendFriendRequestRequest;
import com.calorielog.module.social.entity.FriendRequest;
import com.calorielog.module.social.entity.Friendship;
import com.calorielog.module.social.mapper.FriendRequestMapper;
import com.calorielog.module.social.mapper.FriendshipMapper;
import com.calorielog.module.user.entity.User;
import com.calorielog.module.user.entity.UserExperience;
import com.calorielog.module.user.mapper.UserExperienceMapper;
import com.calorielog.module.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class FriendService {

    private final UserMapper userMapper;
    private final UserExperienceMapper experienceMapper;
    private final FriendRequestMapper friendRequestMapper;
    private final FriendshipMapper friendshipMapper;
    private final DietRecordMapper dietRecordMapper;
    private final RankingService rankingService;

    public FriendSearchResponse searchByPhone(Long currentUserId, String phone) {
        if (phone == null || phone.isBlank()) throw new BizException(ErrorCode.PARAM_INVALID, "请输入手机号");
        User target = userMapper.findByPhone(phone.trim());
        if (target == null) throw new BizException(ErrorCode.USER_NOT_FOUND);

        FriendSearchResponse resp = new FriendSearchResponse();
        resp.setUserId(target.getId());
        resp.setNickname(target.getNickname() == null ? "用户" + target.getId() : target.getNickname());
        resp.setAvatarUrl(target.getAvatarUrl());
        resp.setMaskedPhone(IdentifierUtils.maskPhone(target.getPhone()));
        UserExperience ue = experienceMapper.selectOne(
                new QueryWrapper<UserExperience>().eq("user_id", target.getId()));
        resp.setLevel(ue == null || ue.getLevel() == null ? 1 : ue.getLevel());

        if (target.getId().equals(currentUserId)) {
            resp.setRelation("self");
        } else if (isFriend(currentUserId, target.getId())) {
            resp.setRelation("already_friend");
        } else if (hasPendingRequest(currentUserId, target.getId())) {
            resp.setRelation("request_pending");
        } else {
            resp.setRelation("not_friend");
        }
        return resp;
    }

    @Transactional
    public FriendRequestResponse sendRequest(Long currentUserId, SendFriendRequestRequest req) {
        if (req.getToUserId().equals(currentUserId)) throw new BizException(ErrorCode.CANNOT_ADD_SELF);
        User target = userMapper.selectById(req.getToUserId());
        if (target == null) throw new BizException(ErrorCode.USER_NOT_FOUND);

        if (isFriend(currentUserId, target.getId())) throw new BizException(ErrorCode.FRIEND_ALREADY_EXISTS);
        if (hasPendingRequest(currentUserId, target.getId())) throw new BizException(ErrorCode.FRIEND_REQUEST_EXISTS);

        FriendRequest fr = new FriendRequest();
        fr.setFromUserId(currentUserId);
        fr.setToUserId(target.getId());
        fr.setMessage(req.getMessage());
        fr.setStatus(FriendRequest.STATUS_PENDING);
        fr.setCreatedAt(LocalDateTime.now());
        friendRequestMapper.insert(fr);
        return toRequestResponse(fr, "outgoing", null);
    }

    public List<FriendRequestResponse> listRequests(Long currentUserId, String direction) {
        QueryWrapper<FriendRequest> w = new QueryWrapper<>();
        if ("outgoing".equals(direction)) {
            w.eq("from_user_id", currentUserId);
        } else if ("incoming".equals(direction)) {
            w.eq("to_user_id", currentUserId);
        } else {
            w.and(q -> q.eq("from_user_id", currentUserId).or().eq("to_user_id", currentUserId));
        }
        w.orderByDesc("created_at");
        List<FriendRequest> all = friendRequestMapper.selectList(w);
        if (all.isEmpty()) return List.of();

        java.util.Set<Long> uids = new java.util.HashSet<>();
        for (FriendRequest r : all) {
            uids.add(r.getFromUserId());
            uids.add(r.getToUserId());
        }
        Map<Long, User> userMap = new HashMap<>();
        for (User u : userMapper.selectBatchIds(uids)) userMap.put(u.getId(), u);

        List<FriendRequestResponse> out = new ArrayList<>(all.size());
        for (FriendRequest r : all) {
            String dir = r.getFromUserId().equals(currentUserId) ? "outgoing" : "incoming";
            out.add(toRequestResponse(r, dir, userMap));
        }
        return out;
    }

    @Transactional
    public FriendRequestResponse handle(Long currentUserId, Long requestId, HandleFriendRequestRequest req) {
        FriendRequest fr = friendRequestMapper.selectById(requestId);
        if (fr == null || !fr.getToUserId().equals(currentUserId)) {
            throw new BizException(ErrorCode.FRIEND_REQUEST_NOT_FOUND);
        }
        if (fr.getStatus() != FriendRequest.STATUS_PENDING) {
            throw new BizException(ErrorCode.FRIEND_REQUEST_NOT_FOUND);
        }
        fr.setHandledAt(LocalDateTime.now());
        if ("accept".equals(req.getAction())) {
            friendRequestMapper.expirePriorTerminal(fr.getFromUserId(), fr.getToUserId(), fr.getId());
            fr.setStatus(FriendRequest.STATUS_ACCEPTED);
            friendRequestMapper.updateById(fr);
            createFriendship(fr.getFromUserId(), fr.getToUserId());
            rankingService.primeUser(fr.getFromUserId());
            rankingService.primeUser(fr.getToUserId());
        } else if ("reject".equals(req.getAction())) {
            friendRequestMapper.expirePriorTerminal(fr.getFromUserId(), fr.getToUserId(), fr.getId());
            fr.setStatus(FriendRequest.STATUS_REJECTED);
            friendRequestMapper.updateById(fr);
        } else {
            throw new BizException(ErrorCode.PARAM_INVALID, "action 仅支持 accept/reject");
        }
        return toRequestResponse(fr, "incoming", null);
    }

    void createFriendship(Long a, Long b) {
        upsertOne(a, b);
        upsertOne(b, a);
    }

    private void upsertOne(Long userId, Long friendId) {
        Friendship existing = friendshipMapper.selectOne(
                new QueryWrapper<Friendship>().eq("user_id", userId).eq("friend_id", friendId));
        if (existing != null) return;
        // 若存在被软删的历史行，唯一约束会阻止 INSERT，先复活
        if (friendshipMapper.reviveIfSoftDeleted(userId, friendId) == 1) return;
        Friendship f = new Friendship();
        f.setUserId(userId);
        f.setFriendId(friendId);
        f.setCreatedAt(LocalDateTime.now());
        friendshipMapper.insert(f);
    }

    public List<FriendResponse> listFriends(Long currentUserId) {
        QueryWrapper<Friendship> w = new QueryWrapper<>();
        w.eq("user_id", currentUserId).orderByAsc("created_at");
        List<Friendship> rows = friendshipMapper.selectList(w);
        if (rows.isEmpty()) return List.of();

        List<Long> friendIds = rows.stream().map(Friendship::getFriendId).toList();
        Map<Long, User> users = new HashMap<>();
        for (User u : userMapper.selectBatchIds(friendIds)) users.put(u.getId(), u);
        Map<Long, UserExperience> exps = new HashMap<>();
        for (UserExperience e : experienceMapper.selectList(
                new QueryWrapper<UserExperience>().in("user_id", friendIds))) {
            exps.put(e.getUserId(), e);
        }
        // 今日是否记录饮食：一次 IN 查询拉完
        java.util.Set<Long> recordedToday = new java.util.HashSet<>(
                dietRecordMapper.findUserIdsWithRecord(friendIds, LocalDate.now()));

        List<FriendResponse> out = new ArrayList<>(rows.size());
        for (Friendship f : rows) {
            User u = users.get(f.getFriendId());
            UserExperience e = exps.get(f.getFriendId());
            FriendResponse r = new FriendResponse();
            r.setFriendshipId(f.getId());
            r.setFriendUserId(f.getFriendId());
            r.setRemark(f.getRemark());
            r.setCreatedAt(f.getCreatedAt());
            r.setNickname(u == null || u.getNickname() == null ? "用户" + f.getFriendId() : u.getNickname());
            r.setAvatarUrl(u == null ? null : u.getAvatarUrl());
            r.setLevel(e == null || e.getLevel() == null ? 1 : e.getLevel());
            r.setTotalExp(e == null || e.getTotalExp() == null ? 0L : e.getTotalExp());
            r.setContinuousDays(e == null || e.getContinuousDays() == null ? 0 : e.getContinuousDays());
            r.setLastRecordDate(e == null ? null : e.getLastRecordDate());
            r.setRecordedToday(recordedToday.contains(f.getFriendId()));
            out.add(r);
        }
        return out;
    }

    @Transactional
    public void delete(Long currentUserId, Long friendUserId) {
        Friendship a = friendshipMapper.selectOne(
                new QueryWrapper<Friendship>().eq("user_id", currentUserId).eq("friend_id", friendUserId));
        if (a != null) friendshipMapper.deleteById(a.getId());
        Friendship b = friendshipMapper.selectOne(
                new QueryWrapper<Friendship>().eq("user_id", friendUserId).eq("friend_id", currentUserId));
        if (b != null) friendshipMapper.deleteById(b.getId());
    }

    @Transactional
    public FriendResponse updateRemark(Long currentUserId, Long friendUserId, String remark) {
        Friendship f = friendshipMapper.selectOne(
                new QueryWrapper<Friendship>().eq("user_id", currentUserId).eq("friend_id", friendUserId));
        if (f == null) throw new BizException(ErrorCode.NOT_FOUND);
        f.setRemark(remark);
        friendshipMapper.updateById(f);
        FriendResponse r = new FriendResponse();
        r.setFriendshipId(f.getId());
        r.setFriendUserId(f.getFriendId());
        r.setRemark(f.getRemark());
        return r;
    }

    boolean isFriend(Long userId, Long otherId) {
        Long cnt = friendshipMapper.selectCount(
                new QueryWrapper<Friendship>().eq("user_id", userId).eq("friend_id", otherId));
        return cnt != null && cnt > 0;
    }

    boolean hasPendingRequest(Long fromUserId, Long toUserId) {
        Long cnt = friendRequestMapper.selectCount(new QueryWrapper<FriendRequest>()
                .eq("status", FriendRequest.STATUS_PENDING)
                .and(q -> q
                        .nested(n -> n.eq("from_user_id", fromUserId).eq("to_user_id", toUserId))
                        .or()
                        .nested(n -> n.eq("from_user_id", toUserId).eq("to_user_id", fromUserId))));
        return cnt != null && cnt > 0;
    }

    private FriendRequestResponse toRequestResponse(FriendRequest r, String direction, Map<Long, User> userMap) {
        FriendRequestResponse out = new FriendRequestResponse();
        out.setId(r.getId());
        out.setFromUserId(r.getFromUserId());
        out.setToUserId(r.getToUserId());
        out.setMessage(r.getMessage());
        out.setStatus(r.getStatus());
        out.setCreatedAt(r.getCreatedAt());
        out.setHandledAt(r.getHandledAt());
        out.setDirection(direction);
        User from = userMap != null ? userMap.get(r.getFromUserId()) : userMapper.selectById(r.getFromUserId());
        User to = userMap != null ? userMap.get(r.getToUserId()) : userMapper.selectById(r.getToUserId());
        out.setFromNickname(from == null || from.getNickname() == null ? "用户" + r.getFromUserId() : from.getNickname());
        out.setToNickname(to == null || to.getNickname() == null ? "用户" + r.getToUserId() : to.getNickname());
        return out;
    }
}
